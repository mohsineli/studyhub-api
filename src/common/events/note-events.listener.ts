import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RedisService } from '../../redis/redis.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { NoteStatus } from '../../notes/entities/note.entity';
import { NoteDownloadedEvent, NoteStatusChangedEvent } from './index';
import { CACHE_KEYS } from '../constants/cache-keys';
import { OTHER } from '../constants/defaults';

@Injectable()
export class NoteEventsListener {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @OnEvent('note.downloaded')
  async handleNoteDownloaded(event: NoteDownloadedEvent) {
    if (event.downloaderId && event.ownerId && event.downloaderId !== event.ownerId) {
      await this.userRepository.increment({ id: event.ownerId }, 'points', OTHER.POINTS_PER_DOWNLOAD);
      await this.userRepository.increment({ id: event.downloaderId }, 'points', OTHER.POINTS_PER_DOWNLOAD);
      await this.redisService.delByPattern(CACHE_KEYS.LEADERBOARD_PATTERN);
    }
  }

  @OnEvent('note.status-changed')
  async handleNoteStatusChanged(event: NoteStatusChangedEvent) {
    if (event.status === NoteStatus.APPROVED) {
      await this.userRepository.increment({ id: event.uploaderId }, 'points', OTHER.POINTS_PER_NOTE_APPROVAL);
      await this.redisService.delByPattern(CACHE_KEYS.LEADERBOARD_PATTERN);
      await this.notificationsService.create({
        userId: event.uploaderId,
        type: NotificationType.NOTE_APPROVED,
        title: 'Your note has been approved',
        message: `"${event.title}" has been approved and is now visible to everyone.`,
        entityType: 'note',
        entityId: event.noteId,
        redirectUrl: `/notes/${event.noteId}`,
      });
    }

    if (event.status === NoteStatus.REJECTED) {
      await this.notificationsService.create({
        userId: event.uploaderId,
        type: NotificationType.NOTE_REJECTED,
        title: 'Your note has been rejected',
        message: `"${event.title}" was not approved. Please review the guidelines and resubmit.`,
        entityType: 'note',
        entityId: event.noteId,
        redirectUrl: `/notes/${event.noteId}`,
      });
    }
  }
}
