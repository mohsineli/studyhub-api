import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { IUserRepository } from './user-repository.interface';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  async findById(id: number): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async save(user: Partial<User>): Promise<User> {
    return this.repo.save(user);
  }

  create(data: Partial<User>): User {
    return this.repo.create(data);
  }

  async remove(user: User): Promise<User> {
    return this.repo.remove(user);
  }

  async count(): Promise<number> {
    return this.repo.count();
  }

  async findTopByPoints(limit: number): Promise<User[]> {
    return this.repo.find({
      order: { points: 'DESC' },
      take: limit,
    });
  }

  async incrementPoints(id: number, amount: number): Promise<void> {
    await this.repo.increment({ id }, 'points', amount);
  }

  async updateLastActive(id: number): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(User)
      .set({ last_active_at: () => 'NOW()' })
      .where('id = :id', { id })
      .execute();
  }

  createQueryBuilder(alias: string) {
    return this.repo.createQueryBuilder(alias);
  }
}
