import { Notification } from '../../notifications/entities/notification.entity';

export interface INotificationRepository {
  save(notification: Notification): Promise<Notification>;
  findOne(options: { where: any }): Promise<Notification | null>;
  findAndCount(options: { where: any; order?: any; take?: number; skip?: number }): Promise<[Notification[], number]>;
  count(options?: { where?: any }): Promise<number>;
  update(criteria: any, data: any): Promise<any>;
  delete(where: any): Promise<any>;
}
