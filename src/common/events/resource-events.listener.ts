import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisService } from '../../redis/redis.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { ResourceStatus } from '../../resources/entities/resource.entity';
import { ResourceStatusChangedEvent } from './index';
import { CACHE_KEYS } from '../constants/cache-keys';
import { OTHER } from '../constants/defaults';
import { UserRepository } from '../repositories/user.repository';
import { WebsocketService } from '../../websocket/websocket.service';

@Injectable()
export class ResourceEventsListener {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly redisService: RedisService,
    private readonly notificationsService: NotificationsService,
    private readonly websocketService: WebsocketService,
  ) {}

  @OnEvent('resource.status-changed')
  async handleResourceStatusChanged(event: ResourceStatusChangedEvent) {
    const lockKey = `event:resource:${event.resourceId}:${event.status}`;
    const acquired = await this.redisService.setnx(lockKey, '1', 300);
    if (!acquired) return;

    try {
      if (event.status === ResourceStatus.APPROVED) {
        await this.userRepository.increment({ id: event.uploaderId }, 'points', OTHER.POINTS_PER_RESOURCE_APPROVAL);

        const user = await this.userRepository.findById(event.uploaderId);
        if (user) {
          this.websocketService.emitToUser(event.uploaderId, 'points:updated', { points: user.points });
        }

        await this.redisService.delByPattern(CACHE_KEYS.LEADERBOARD_PATTERN);
        const notification = await this.notificationsService.create({
          userId: event.uploaderId,
          type: NotificationType.RESOURCE_APPROVED,
          title: 'Your resource has been approved',
          message: `"${event.title}" has been approved and is now available to everyone.`,
          entityType: 'resource',
          entityId: event.resourceId,
          redirectUrl: `/resources/${event.resourceId}`,
        });
        this.websocketService.emitToUser(event.uploaderId, 'notification:new', notification);
        this.websocketService.emitToModerators('moderation:resolved', {
          itemId: event.resourceId,
          type: 'resource',
          status: 'approved',
        });
      }

      if (event.status === ResourceStatus.REJECTED) {
        const notification = await this.notificationsService.create({
          userId: event.uploaderId,
          type: NotificationType.RESOURCE_REJECTED,
          title: 'Your resource has been rejected',
          message: `"${event.title}" was not approved. Please review the guidelines and resubmit.`,
          entityType: 'resource',
          entityId: event.resourceId,
          redirectUrl: `/resources/${event.resourceId}`,
        });
        this.websocketService.emitToUser(event.uploaderId, 'notification:new', notification);
        this.websocketService.emitToModerators('moderation:resolved', {
          itemId: event.resourceId,
          type: 'resource',
          status: 'rejected',
        });
      }
    } catch (error) {
      await this.redisService.del(lockKey);
      throw error;
    }
  }
}
