import { Injectable } from '@nestjs/common';
import { NoteStatus } from '../notes/entities/note.entity';
import { RedisService } from '../redis/redis.service';
import { CACHE_KEYS } from '../common/constants/cache-keys';
import { CACHE_TTL, TOP_N } from '../common/constants/defaults';
import { UserRepository } from '../common/repositories/user.repository';
import { NoteRepository } from '../common/repositories/note.repository';
import { ReviewRepository } from '../common/repositories/review.repository';
import { ResourceRepository } from '../common/repositories/resource.repository';
import { SessionRepository } from '../common/repositories/session.repository';

@Injectable()
export class StatsService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly noteRepository: NoteRepository,
    private readonly reviewRepository: ReviewRepository,
    private readonly resourceRepository: ResourceRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly redisService: RedisService,
  ) {}

  async getStats() {
    return this.redisService.wrap(CACHE_KEYS.ADMIN_STATS, CACHE_TTL.ADMIN_STATS, async () => {
      const totalUsers = await this.userRepository.count();
      const totalPendingNotes = await this.noteRepository.count({ where: { status: NoteStatus.PENDING } });
      const totalApprovedNotes = await this.noteRepository.count({ where: { status: NoteStatus.APPROVED } });
      const totalReviews = await this.reviewRepository.count();
      const totalResources = await this.resourceRepository.count();

      return {
        totalUsers,
        totalPendingNotes,
        totalApprovedNotes,
        totalReviews,
        totalResources,
      };
    });
  }

  async getActiveUsers() {
    return this.redisService.wrap(CACHE_KEYS.ADMIN_ACTIVE_USERS, CACHE_TTL.ADMIN_ACTIVE_USERS, async () => {
      const rawData = await this.sessionRepository.createQueryBuilder('session')
        .select('DATE(session.created_at)', 'date')
        .addSelect('COUNT(DISTINCT session.userId)', 'active_users')
        .groupBy('DATE(session.created_at)')
        .orderBy('DATE(session.created_at)', 'ASC')
        .getRawMany();
      return rawData;
    });
  }

  async getReport() {
    return this.redisService.wrap(CACHE_KEYS.ADMIN_REPORT, CACHE_TTL.ADMIN_REPORT, async () => {
      const topUsers = await this.userRepository.find({
        order: { points: 'DESC' },
        take: TOP_N.TOP_USERS,
        select: ['id', 'name', 'email', 'points', 'dept'],
      });

      const notesPerDept = await this.noteRepository.createQueryBuilder('note')
        .select('note.dept', 'dept')
        .addSelect('COUNT(note.id)', 'count')
        .where('note.status = :status', { status: NoteStatus.APPROVED })
        .groupBy('note.dept')
        .getRawMany();

      return { topUsers, notesPerDept };
    });
  }
}
