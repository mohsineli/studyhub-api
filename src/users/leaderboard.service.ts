import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { NoteStatus } from '../notes/entities/note.entity';
import { Setting } from '../admin/entities/setting.entity';
import { RedisService } from '../redis/redis.service';
import { CACHE_KEYS } from '../common/constants/cache-keys';
import { CACHE_TTL, TOP_N, OTHER } from '../common/constants/defaults';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Setting) private readonly settingRepository: Repository<Setting>,
    private readonly redisService: RedisService,
  ) {}

  async getLeaderboard(period?: string): Promise<(User & { noteCount: number })[]> {
    if (period === 'previous') {
      return this.getPreviousLeaderboard();
    }

    await this.applyMonthlyReset();

    const cacheKey = CACHE_KEYS.LEADERBOARD_CURRENT;

    return this.redisService.wrap(cacheKey, CACHE_TTL.LEADERBOARD, async () => {
      const query = this.usersRepository.createQueryBuilder('user')
        .select(['user.id', 'user.name', 'user.email', 'user.role', 'user.banned', 'user.points', 'user.created_at', 'user.profile_pic', 'user.dept'])
        .loadRelationCountAndMap('user.noteCount', 'user.notes', 'note', qb =>
          qb.andWhere('note.status = :status', { status: NoteStatus.APPROVED })
        )
        .where('user.banned = :banned', { banned: false })
        .orderBy('user.points', 'DESC')
        .addOrderBy('user.name', 'ASC')
        .take(TOP_N.LEADERBOARD);

      return await query.getMany() as (User & { noteCount: number })[];
    });
  }

  async takeSnapshot() {
    const leaders = await this.usersRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.name', 'user.email', 'user.role', 'user.banned', 'user.points', 'user.created_at', 'user.profile_pic', 'user.dept'])
      .where('user.banned = :banned', { banned: false })
      .orderBy('user.points', 'DESC')
      .addOrderBy('user.name', 'ASC')
      .take(TOP_N.LEADERBOARD)
      .getMany();

    const clean = leaders.map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      banned: u.banned, points: u.points, created_at: u.created_at,
      profile_pic: u.profile_pic, dept: u.dept, noteCount: 0,
    }));

    const snapshot = JSON.stringify(clean);
    let setting = await this.settingRepository.findOne({ where: { key: 'leaderboard_previous_snapshot' } });
    if (!setting) {
      setting = this.settingRepository.create({ key: 'leaderboard_previous_snapshot', value: snapshot });
    } else {
      setting.value = snapshot;
    }
    await this.settingRepository.save(setting);
  }

  private async applyMonthlyReset() {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

    let resetSetting = await this.settingRepository.findOne({ where: { key: 'leaderboard_reset_month' } });

    if (!resetSetting || resetSetting.value !== currentMonthKey) {
      await this.takeSnapshot();

      if (!resetSetting) {
        resetSetting = this.settingRepository.create({ key: 'leaderboard_reset_month', value: currentMonthKey });
      } else {
        resetSetting.value = currentMonthKey;
      }
      await this.settingRepository.save(resetSetting);

      await this.usersRepository
        .createQueryBuilder()
        .update(User)
        .set({ points: OTHER.LEADERBOARD_POINTS_THRESHOLD })
        .where('points >= :max', { max: OTHER.LEADERBOARD_POINTS_THRESHOLD })
        .execute();

      await this.redisService.delByPattern(CACHE_KEYS.LEADERBOARD_PATTERN);
    }
  }

  private async getPreviousLeaderboard(): Promise<(User & { noteCount: number })[]> {
    try {
      const setting = await this.settingRepository.findOne({ where: { key: 'leaderboard_previous_snapshot' } });
      if (setting?.value) {
        return JSON.parse(setting.value) as (User & { noteCount: number })[];
      }
    } catch {}
    return [];
  }
}
