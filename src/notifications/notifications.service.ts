import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
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
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Notification> = { user_id: userId };
    if (options.unreadOnly) where.is_read = false;

    const [data, total] = await this.notificationRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      take: limit,
      skip,
    });

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
      { is_read: true },
    );
    return this.notificationRepository.findOne({ where: { id } });
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update(
      { user_id: userId, is_read: false },
      { is_read: true },
    );
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const result = await this.notificationRepository.delete({ id, user_id: userId });
    return (result.affected ?? 0) > 0;
  }
}
