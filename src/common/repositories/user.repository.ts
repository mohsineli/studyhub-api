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

  async findOne(options: { where: any; relations?: string[] }): Promise<User | null> {
    return this.repo.findOne(options as any);
  }

  async find(options: { where?: any; relations?: string[]; order?: any; take?: number; select?: string[] }): Promise<User[]> {
    return this.repo.find(options as any);
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

  async count(options?: { where?: any }): Promise<number> {
    return this.repo.count(options ?? {});
  }

  async findTopByPoints(limit: number): Promise<User[]> {
    return this.repo.find({
      order: { points: 'DESC' },
      take: limit,
    });
  }

  async increment(where: any, column: string, amount: number): Promise<any> {
    return this.repo.increment(where, column, amount);
  }

  async incrementPoints(id: number, amount: number): Promise<void> {
    await this.repo.increment({ id }, 'points', amount);
  }

  async update(where: any, partial: Partial<User>): Promise<any> {
    return this.repo.update(where, partial);
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
