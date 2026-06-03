import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PendingUser } from '../../auth/entities/pending-user.entity';
import { IPendingUserRepository } from './pending-user-repository.interface';

@Injectable()
export class PendingUserRepository implements IPendingUserRepository {
  constructor(
    @InjectRepository(PendingUser) private readonly repo: Repository<PendingUser>,
  ) {}

  create(data: Partial<PendingUser>): PendingUser {
    return this.repo.create(data);
  }

  async save(pendingUser: PendingUser): Promise<PendingUser> {
    return this.repo.save(pendingUser);
  }

  async findOne(options: { where: any }): Promise<PendingUser | null> {
    return this.repo.findOne(options as any);
  }

  async remove(pendingUser: PendingUser): Promise<PendingUser> {
    return this.repo.remove(pendingUser);
  }
}
