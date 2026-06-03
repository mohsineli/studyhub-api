import { PendingUser } from '../../auth/entities/pending-user.entity';

export interface IPendingUserRepository {
  create(data: Partial<PendingUser>): PendingUser;
  save(pendingUser: PendingUser): Promise<PendingUser>;
  findOne(options: { where: any }): Promise<PendingUser | null>;
  remove(pendingUser: PendingUser): Promise<PendingUser>;
}
