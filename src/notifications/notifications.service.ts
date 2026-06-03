import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { PAGINATION, OTHER } from '../common/constants/defaults';
import { buildPagination } from '../common/pagination/pagination.helper';
import { NotificationRepository } from '../common/repositories/notification.repository';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async create(data: {
    userId: number;
    actorId?: number;
    type: NotificationType | string;
    title: string;
    message?: string;
    entityType: string;
    entityId?: number;
    redirectUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<Notification> {
    const notification = new Notification();
    notification.user_id = data.userId;
    notification.actor_id = data.actorId ?? null;
    notification.type = data.type;
    notification.title = data.title;
    notification.message = data.message ?? null;
    notification.entity_type = data.entityType;
    notification.entity_id = data.entityId ?? null;
    notification.redirect_url = data.redirectUrl ?? null;
    notification.metadata = data.metadata ?? null;
    return this.notificationRepository.save(notification);
  }

  async findByUser(
    userId: number,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
    } = {},
  ): Promise<{ data: Notification[]; total: number; unreadCount: number }> {
    const page = options.page || PAGINATION.DEFAULT_PAGE;
    const limit = options.limit || PAGINATION.NOTIFICATIONS_LIMIT;
    const { take, skip } = buildPagination(page, limit);

    const where: any = { user_id: userId };
    if (options.unreadOnly) where.is_read = false;

    const [data, total] = await this.notificationRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      take,
      skip,
    } as any);

    const unreadCount = await this.notificationRepository.count({
      where: { user_id: userId, is_read: false },
    });

    return { data, total, unreadCount };
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepository.count({
      where: { user_id: userId, is_read: false },
    });
  }

  async markAsRead(id: number, userId: number): Promise<Notification | null> {
    await this.notificationRepository.update(
      { id, user_id: userId },
      { is_read: true, read_at: new Date() },
    );
    return this.notificationRepository.findOne({ where: { id } } as any);
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update(
      { user_id: userId, is_read: false },
      { is_read: true, read_at: new Date() },
    );
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const result = await this.notificationRepository.delete({ id, user_id: userId });
    return (result.affected ?? 0) > 0;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldReadNotifications(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - OTHER.NOTIFICATION_RETENTION_DAYS);

    await this.notificationRepository.delete({
      is_read: true,
      read_at: LessThan(thirtyDaysAgo),
    });
  }
}
