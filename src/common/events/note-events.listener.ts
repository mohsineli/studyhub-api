import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../redis/redis.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { Note, NoteStatus } from '../../notes/entities/note.entity';
import { NoteDownloadedEvent, NoteStatusChangedEvent } from './index';
import { CACHE_KEYS } from '../constants/cache-keys';
import { OTHER } from '../constants/defaults';
import { UserRepository } from '../repositories/user.repository';
import { WebsocketService } from '../../websocket/websocket.service';

@Injectable()
export class NoteEventsListener {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly redisService: RedisService,
    private readonly notificationsService: NotificationsService,
    private readonly websocketService: WebsocketService,
    @InjectRepository(Note) private readonly noteRepository: Repository<Note>,
  ) {}

  @OnEvent('note.downloaded')
  async handleNoteDownloaded(event: NoteDownloadedEvent) {
    if (event.downloaderId && event.ownerId && event.downloaderId !== event.ownerId) {
      await this.userRepository.increment({ id: event.ownerId }, 'points', OTHER.POINTS_PER_DOWNLOAD);
      await this.userRepository.increment({ id: event.downloaderId }, 'points', OTHER.POINTS_PER_DOWNLOAD);

      const owner = await this.userRepository.findById(event.ownerId);
      if (owner) {
        this.websocketService.emitToUser(event.ownerId, 'points:updated', { points: owner.points });
      }
      const downloader = await this.userRepository.findById(event.downloaderId);
      if (downloader) {
        this.websocketService.emitToUser(event.downloaderId, 'points:updated', { points: downloader.points });
      }

      await this.redisService.delByPattern(CACHE_KEYS.LEADERBOARD_PATTERN);
    }
  }

  @OnEvent('note.status-changed')
  async handleNoteStatusChanged(event: NoteStatusChangedEvent) {
    const lockKey = `event:note:${event.noteId}:${event.status}`;
    const acquired = await this.redisService.setnx(lockKey, '1', 300);
    if (!acquired) return;

    try {
      if (event.status === NoteStatus.APPROVED) {
        await this.userRepository.increment({ id: event.uploaderId }, 'points', OTHER.POINTS_PER_NOTE_APPROVAL);

        const user = await this.userRepository.findById(event.uploaderId);
        if (user) {
          this.websocketService.emitToUser(event.uploaderId, 'points:updated', { points: user.points });
        }

        await this.redisService.delByPattern(CACHE_KEYS.LEADERBOARD_PATTERN);
        const notification = await this.notificationsService.create({
          userId: event.uploaderId,
          type: NotificationType.NOTE_APPROVED,
          title: 'Your note has been approved',
          message: `"${event.title}" has been approved and is now visible to everyone.`,
          entityType: 'note',
          entityId: event.noteId,
          redirectUrl: `/notes/${event.noteId}`,
        });
        this.websocketService.emitToUser(event.uploaderId, 'notification:new', notification);
        this.websocketService.emitToModerators('moderation:resolved', {
          itemId: event.noteId,
          type: 'note',
          status: 'approved',
        });
      }

      if (event.status === NoteStatus.REJECTED) {
        await this.noteRepository.update(event.noteId, { rejected_at: new Date() });

        const notification = await this.notificationsService.create({
          userId: event.uploaderId,
          type: NotificationType.NOTE_REJECTED,
          title: 'Your note has been rejected',
          message: `"${event.title}" was not approved. Please review the guidelines and resubmit.`,
          entityType: 'note',
          entityId: event.noteId,
          redirectUrl: `/notes/${event.noteId}`,
        });
        this.websocketService.emitToUser(event.uploaderId, 'notification:new', notification);
        this.websocketService.emitToModerators('moderation:resolved', {
          itemId: event.noteId,
          type: 'note',
          status: 'rejected',
        });
      }
    } catch (error) {
      await this.redisService.del(lockKey);
      throw error;
    }
  }
}
