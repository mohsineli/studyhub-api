import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../notifications/entities/notification.entity';
import { INotificationRepository } from './notification-repository.interface';

@Injectable()
export class NotificationRepository implements INotificationRepository {
  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
  ) {}

  async save(notification: Notification): Promise<Notification> {
    return this.repo.save(notification);
  }

  async findOne(options: { where: any }): Promise<Notification | null> {
    return this.repo.findOne(options as any);
  }

  async findAndCount(options: { where: any; order?: any; take?: number; skip?: number }): Promise<[Notification[], number]> {
    return this.repo.findAndCount(options as any);
  }

  async count(options?: { where?: any }): Promise<number> {
    return this.repo.count(options ?? {});
  }

  async update(criteria: any, data: any): Promise<any> {
    return this.repo.update(criteria, data);
  }

  async delete(where: any): Promise<any> {
    return this.repo.delete(where);
  }
}
