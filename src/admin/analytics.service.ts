import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Note, NoteStatus } from '../notes/entities/note.entity';
import { Review } from '../reviews/entities/review.entity';
import { Resource } from '../resources/entities/resource.entity';
import { Session } from '../auth/entities/session.entity';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Note) private noteRepository: Repository<Note>,
    @InjectRepository(Review) private reviewRepository: Repository<Review>,
    @InjectRepository(Resource) private resourceRepository: Repository<Resource>,
    @InjectRepository(Session) private sessionRepository: Repository<Session>,
    private readonly redisService: RedisService,
  ) {}

  private getDateRange(filter: string): { start: Date; end: Date } | null {
    if (!filter || filter === 'all') return null;
    const now = new Date();
    let start: Date;
    switch (filter) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return null;
    }
    return { start, end: now };
  }

  async getOverview(filter: string = 'all') {
    const cacheKey = `analytics:overview:${filter}`;
    return this.redisService.wrap(cacheKey, 120, async () => {
      const range = this.getDateRange(filter);
      const where = range ? { created_at: Between(range.start, range.end) as any } : {};

      const totalUsers = await this.userRepository.count();
      const totalModerators = await this.userRepository.count({ where: { role: UserRole.MODERATOR } });
      const totalAdmins = await this.userRepository.count({ where: { role: UserRole.ADMIN } });
      const totalBanned = await this.userRepository.count({ where: { banned: true } });
      const newUsers = range ? await this.userRepository.count({ where }) : 0;

      const activeWhere = range ? { last_active_at: Between(range.start, range.end) as any } : {};
      const activeUsers = range ? await this.userRepository.count({ where: activeWhere }) : 0;

      const totalNotes = await this.noteRepository.count();
      const totalResources = await this.resourceRepository.count();
      const totalReviews = await this.reviewRepository.count({ where: { parent_id: null as any } });
      const totalComments = await this.reviewRepository.count({ where: { parent_id: MoreThanOrEqual(0) as any } });
      const totalReports = 0;

      return {
        totalUsers,
        activeUsersToday: 0,
        activeUsersWeek: 0,
        activeUsersMonth: 0,
        newUsersToday: 0,
        newUsersWeek: 0,
        newUsersMonth: 0,
        newUsers,
        activeUsers,
        totalNotes,
        totalResources,
        totalReviews,
        totalComments,
        totalReports,
        totalModerators,
        totalAdmins,
        totalBanned,
      };
    });
  }

  async getUserAnalytics(filter: string = 'all') {
    const cacheKey = `analytics:users:${filter}`;
    return this.redisService.wrap(cacheKey, 120, async () => {
      const range = this.getDateRange(filter);

      const registrationWhere = range
        ? { created_at: Between(range.start, range.end) as any }
        : {};

      const registrations = await this.userRepository
        .createQueryBuilder('user')
        .select("DATE(user.created_at)", "date")
        .addSelect("COUNT(user.id)", "count")
        .where(registrationWhere)
        .groupBy("DATE(user.created_at)")
        .orderBy("DATE(user.created_at)", "ASC")
        .getRawMany();

      const roleDistribution = await this.userRepository
        .createQueryBuilder('user')
        .select("user.role", "role")
        .addSelect("COUNT(user.id)", "count")
        .groupBy("user.role")
        .getRawMany();

      const deptDistribution = await this.userRepository
        .createQueryBuilder('user')
        .select("user.dept", "dept")
        .addSelect("COUNT(user.id)", "count")
        .where("user.dept IS NOT NULL")
        .andWhere("user.dept != ''")
        .groupBy("user.dept")
        .orderBy("COUNT(user.id)", "DESC")
        .getRawMany();

      const mostActive = await this.userRepository
        .createQueryBuilder('user')
        .select(["user.id", "user.name", "user.email", "user.points", "user.dept", "user.last_active_at"])
        .orderBy("user.last_active_at", "DESC")
        .take(20)
        .getMany();

      return {
        registrations,
        roleDistribution,
        deptDistribution,
        mostActive: mostActive.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          points: u.points,
          dept: u.dept,
          lastActive: u.last_active_at,
        })),
      };
    });
  }

  async getActivityAnalytics(filter: string = 'all') {
    const cacheKey = `analytics:activity:${filter}`;
    return this.redisService.wrap(cacheKey, 120, async () => {
      const range = this.getDateRange(filter);

      const where = range
        ? { created_at: Between(range.start, range.end) as any }
        : {};

      const loginActivity = await this.sessionRepository
        .createQueryBuilder('session')
        .select("DATE(session.created_at)", "date")
        .addSelect("COUNT(DISTINCT session.userId)", "activeUsers")
        .where(where)
        .groupBy("DATE(session.created_at)")
        .orderBy("DATE(session.created_at)", "ASC")
        .getRawMany();

      const peakHours = await this.sessionRepository
        .createQueryBuilder('session')
        .select("EXTRACT(HOUR FROM session.created_at)", "hour")
        .addSelect("COUNT(DISTINCT session.userId)", "activeUsers")
        .where(where)
        .groupBy("EXTRACT(HOUR FROM session.created_at)")
        .orderBy("COUNT(DISTINCT session.userId)", "DESC")
        .getRawMany();

      const activeDays = await this.sessionRepository
        .createQueryBuilder('session')
        .select("TO_CHAR(session.created_at, 'Day')", "dayName")
        .addSelect("EXTRACT(DOW FROM session.created_at)", "dow")
        .addSelect("COUNT(DISTINCT session.userId)", "activeUsers")
        .where(where)
        .groupBy("TO_CHAR(session.created_at, 'Day')")
        .addGroupBy("EXTRACT(DOW FROM session.created_at)")
        .orderBy("EXTRACT(DOW FROM session.created_at)", "ASC")
        .getRawMany();

      const lastActiveThreshold = new Date(Date.now() - 5 * 60 * 1000);
      const currentlyActive = await this.userRepository.count({
        where: { last_active_at: MoreThanOrEqual(lastActiveThreshold) as any },
      });

      return {
        loginActivity,
        peakHours: peakHours.map(p => ({
          hour: parseInt(p.hour, 10),
          activeUsers: parseInt(p.activeUsers, 10),
        })),
        activeDays: activeDays.map(d => ({
          day: d.dayName?.trim() || '',
          dow: parseInt(d.dow, 10),
          activeUsers: parseInt(d.activeUsers, 10),
        })),
        currentlyActive,
      };
    });
  }

  async getContentAnalytics(filter: string = 'all') {
    const cacheKey = `analytics:content:${filter}`;
    return this.redisService.wrap(cacheKey, 120, async () => {
      const range = this.getDateRange(filter);

      const where = range
        ? { created_at: Between(range.start, range.end) as any }
        : {};

      const notesCreated = await this.noteRepository
        .createQueryBuilder('note')
        .select("DATE(note.created_at)", "date")
        .addSelect("COUNT(note.id)", "count")
        .where(where)
        .groupBy("DATE(note.created_at)")
        .orderBy("DATE(note.created_at)", "ASC")
        .getRawMany();

      const resourcesCreated = await this.resourceRepository
        .createQueryBuilder('resource')
        .select("DATE(resource.created_at)", "date")
        .addSelect("COUNT(resource.id)", "count")
        .where(where)
        .groupBy("DATE(resource.created_at)")
        .orderBy("DATE(resource.created_at)", "ASC")
        .getRawMany();

      const popularNotes = await this.noteRepository
        .createQueryBuilder('note')
        .leftJoinAndSelect('note.uploader', 'uploader')
        .select([
          'note.id',
          'note.title',
          'note.downloads',
          'note.avg_rating',
          'note.created_at',
          'note.dept',
        ])
        .addSelect(['uploader.id', 'uploader.name'])
        .where('note.status = :status', { status: NoteStatus.APPROVED })
        .orderBy('note.downloads', 'DESC')
        .take(10)
        .getMany();

      const notesTotal = await this.noteRepository.count();
      const notesApproved = await this.noteRepository.count({ where: { status: NoteStatus.APPROVED } });
      const notesPending = await this.noteRepository.count({ where: { status: NoteStatus.PENDING } });
      const totalDownloads = await this.noteRepository
        .createQueryBuilder('note')
        .select("SUM(note.downloads)", "total")
        .getRawOne();

      const reviewsCreated = await this.reviewRepository
        .createQueryBuilder('review')
        .select("DATE(review.created_at)", "date")
        .addSelect("COUNT(review.id)", "count")
        .where({ ...where, parent_id: null })
        .groupBy("DATE(review.created_at)")
        .orderBy("DATE(review.created_at)", "ASC")
        .getRawMany();

      return {
        notesCreated,
        resourcesCreated,
        reviewsCreated,
        popularNotes: popularNotes.map(n => ({
          id: n.id,
          title: n.title,
          downloads: n.downloads,
          avgRating: parseFloat(n.avg_rating?.toString() || '0'),
          dept: n.dept,
          createdAt: n.created_at,
          uploader: n.uploader ? { id: n.uploader.id, name: n.uploader.name } : null,
        })),
        totals: {
          notes: notesTotal,
          approved: notesApproved,
          pending: notesPending,
          totalDownloads: parseInt(totalDownloads?.total || '0', 10),
        },
      };
    });
  }
}
