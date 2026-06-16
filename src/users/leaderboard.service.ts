import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { NoteStatus } from '../notes/entities/note.entity';
import { RedisService } from '../redis/redis.service';
import { CACHE_KEYS } from '../common/constants/cache-keys';
import { CACHE_TTL, TOP_N, OTHER } from '../common/constants/defaults';
import { UserRepository } from '../common/repositories/user.repository';
import { SettingRepository } from '../common/repositories/setting.repository';

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly usersRepository: UserRepository,
    private readonly settingRepository: SettingRepository,
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
      // Capture best rank for all users before the reset wipes points
      const allUsers = await this.usersRepository
        .createQueryBuilder('user')
        .select(['user.id', 'user.points', 'user.best_rank', 'user.best_rank_month', 'user.best_rank_year', 'user.best_rank_points'])
        .where('user.banned = :banned', { banned: false })
        .orderBy('user.points', 'DESC')
        .addOrderBy('user.name', 'ASC')
        .getMany();

      let prevPoints: number | null = null;
      let rank = 0;
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      for (const u of allUsers) {
        if (u.points !== prevPoints) rank++;
        prevPoints = u.points;

        if (u.best_rank === null || rank < u.best_rank) {
          await this.usersRepository.update(u.id, { best_rank: rank, best_rank_month: month, best_rank_year: year, best_rank_points: u.points });
        }
      }

      await this.takeSnapshot();

      if (!resetSetting) {
        resetSetting = this.settingRepository.create({ key: 'leaderboard_reset_month', value: currentMonthKey });
      } else {
        resetSetting.value = currentMonthKey;
      }
      await this.settingRepository.save(resetSetting);

      await this.usersRepository
        .createQueryBuilder('user')
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
