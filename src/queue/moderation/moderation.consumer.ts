import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotesService } from '../../notes/notes.service';
import { ResourcesService } from '../../resources/resources.service';
import { RedisService } from '../../redis/redis.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NoteStatus } from '../../notes/entities/note.entity';
import { ResourceStatus } from '../../resources/entities/resource.entity';

interface ModerationJobData {
  type: 'note' | 'resource';
  itemId: number;
  newStatus: string;
  adminId: number;
  adminRole: string;
  itemTitle: string;
  uploaderId: number;
}

@Processor('moderation')
export class ModerationConsumer extends WorkerHost {
  constructor(
    private readonly notesService: NotesService,
    private readonly resourcesService: ResourcesService,
    private readonly redisService: RedisService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<ModerationJobData>): Promise<void> {
    const { type, itemId, newStatus, adminRole } = job.data;

    if (type === 'note') {
      const note = await this.notesService.findOne(itemId);
      if (note.status === newStatus) return;
      await this.notesService.updateStatus(itemId, newStatus as NoteStatus, adminRole);
    } else if (type === 'resource') {
      const resource = await this.resourcesService.findOne(itemId);
      if (resource.status === newStatus) return;
      await this.resourcesService.updateStatus(itemId, newStatus as ResourceStatus, adminRole);
    }

    await this.redisService.set(`moderation:job:${job.id}`, { status: 'completed' }, 120);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<ModerationJobData>, error: Error) {
    const { type, itemId, newStatus, adminId, uploaderId, itemTitle } = job.data;

    // Only process final failure when all retry attempts are exhausted
    if (job.attemptsMade < (job.opts?.attempts || 1)) {
      return;
    }

    await this.redisService.set(`moderation:job:${job.id}`, {
      status: 'failed',
      error: error.message,
      itemId,
      type,
      newStatus,
    }, 300);

    await this.notificationsService.create({
      userId: adminId,
      type: 'system',
      title: 'Status update failed',
      message: `Failed to ${newStatus} ${type} #${itemId}. ${error.message}`,
      entityType: type,
      entityId: itemId,
    });

    await this.notificationsService.create({
      userId: uploaderId,
      type: 'system',
      title: `${type} moderation issue`,
      message: `Something went wrong while updating the status of your ${type} "${itemTitle}". Please contact support.`,
      entityType: type,
      entityId: itemId,
    });
  }
}
