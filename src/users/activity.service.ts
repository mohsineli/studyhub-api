import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { Session } from '../auth/entities/session.entity';
import { SettingsService } from '../admin/settings.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Session) private readonly sessionRepository: Repository<Session>,
    private readonly settingsService: SettingsService,
    private readonly redisService: RedisService,
  ) {}

  async updateLastActive(id: number): Promise<void> {
    await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({ last_active_at: () => 'NOW()' })
      .where('id = :id', { id })
      .execute();

    await this.redisService.delByPattern('activeUsers:*');
  }

  async findActiveUsersByDay(userRole: string, dateString?: string, page?: number, limit?: number) {
    if (userRole !== UserRole.ADMIN) {
      await this.settingsService.enforcePermission(userRole, 'perm_view_active_users');
    }
    let dateStr = dateString;
    if (!dateStr) {
      const d = new Date();
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
    }

    const take = limit || 12;
    const skip = page ? (page - 1) * take : 0;

    const sessionSubquery = this.sessionRepository
      .createQueryBuilder('session')
      .select('DISTINCT session.userId')
      .where("TO_CHAR(session.created_at, 'YYYY-MM-DD') = :dateStr", { dateStr });

    const query = this.usersRepository.createQueryBuilder('user')
      .select(['user.id', 'user.name', 'user.email', 'user.role', 'user.banned', 'user.points', 'user.last_active_at', 'user.profile_pic', 'user.dept'])
      .where(`user.id IN (${sessionSubquery.getQuery()})`)
      .setParameters(sessionSubquery.getParameters())
      .orderBy('user.last_active_at', 'DESC')
      .take(take)
      .skip(skip);

    const [users, total] = await query.getManyAndCount();
    return { data: users, total, page: page || 1, limit: take };
  }

  async findCurrentlyActiveUsers(userRole: string, minutes: number = 5, page?: number, limit?: number) {
    if (userRole !== UserRole.ADMIN) {
      await this.settingsService.enforcePermission(userRole, 'perm_view_active_users');
    }

    const take = limit || 12;
    const skip = page ? (page - 1) * take : 0;
    const cacheKey = `activeUsers:${userRole}:${page || 1}:${take}`;

    return this.redisService.wrap(cacheKey, 30, async () => {
      const query = this.usersRepository.createQueryBuilder('user')
        .select(['user.id', 'user.name', 'user.email', 'user.role', 'user.banned', 'user.points', 'user.last_active_at', 'user.profile_pic', 'user.dept'])
        .where('user.last_active_at >= NOW() - make_interval(mins => :minutes)', { minutes })
        .orderBy('user.last_active_at', 'DESC')
        .take(take)
        .skip(skip);

      const [users, total] = await query.getManyAndCount();
      return { data: users, total, page: page || 1, limit: take };
    });
  }
}
