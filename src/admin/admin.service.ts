import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Note, NoteStatus } from '../notes/entities/note.entity';
import { Review } from '../reviews/entities/review.entity';
import { Resource } from '../resources/entities/resource.entity';
import { Session } from '../auth/entities/session.entity';
import { Setting } from './entities/setting.entity';
import { RedisService } from '../redis/redis.service';

export const MODERATOR_PERMISSIONS = [
  { key: 'perm_view_active_users', label: 'Active Users', description: 'View active user statistics' },
  { key: 'perm_manage_notes', label: 'Notes Moderation', description: 'Approve or reject note submissions' },
  { key: 'perm_manage_resources', label: 'Resources Moderation', description: 'Approve or reject resource submissions' },
  { key: 'perm_view_users', label: 'User Directory', description: 'View registered users directory' },
  { key: 'perm_view_resources', label: 'Library Resources', description: 'View library resources list' },
  { key: 'perm_manage_trending', label: 'Trending Content', description: 'View and manage trending content' },
];

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Note) private noteRepository: Repository<Note>,
    @InjectRepository(Review) private reviewRepository: Repository<Review>,
    @InjectRepository(Resource) private resourceRepository: Repository<Resource>,
    @InjectRepository(Session) private sessionRepository: Repository<Session>,
    @InjectRepository(Setting) private settingRepository: Repository<Setting>,
    private readonly redisService: RedisService,
  ) {}

  async getStats() {
    return this.redisService.wrap('admin:stats', 300, async () => {
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
    // Group sessions by Date(created_at) and count distinct userIds
    const rawData = await this.sessionRepository.createQueryBuilder('session')
      .select('DATE(session.created_at)', 'date')
      .addSelect('COUNT(DISTINCT session.userId)', 'active_users')
      .groupBy('DATE(session.created_at)')
      .orderBy('DATE(session.created_at)', 'ASC')
      .getRawMany();

    return rawData;
  }

  async getReport() {
    const topUsers = await this.userRepository.find({
      order: { points: 'DESC' },
      take: 10,
      select: ['id', 'name', 'email', 'points', 'dept']
    });

    const notesPerDept = await this.noteRepository.createQueryBuilder('note')
        .select('note.dept', 'dept')
        .addSelect('COUNT(note.id)', 'count')
        .where('note.status = :status', { status: NoteStatus.APPROVED })
        .groupBy('note.dept')
        .getRawMany();

    return {
      topUsers,
      notesPerDept
    };
  }

  async getSetting(key: string, defaultValue: string): Promise<string> {
    const setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting) {
      const newSetting = this.settingRepository.create({ key, value: defaultValue });
      await this.settingRepository.save(newSetting);
      return defaultValue;
    }
    return setting.value;
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    let setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting) {
      setting = this.settingRepository.create({ key, value });
    } else {
      setting.value = value;
    }
    return await this.settingRepository.save(setting);
  }

  async getModeratorPermissions(): Promise<{ key: string; label: string; description: string; value: string }[]> {
    const results: { key: string; label: string; description: string; value: string }[] = [];
    for (const perm of MODERATOR_PERMISSIONS) {
      const value = await this.getSetting(perm.key, 'admin');
      results.push({ ...perm, value });
    }
    return results;
  }

  async setModeratorPermission(key: string, value: string): Promise<{ key: string; value: string }> {
    const perm = MODERATOR_PERMISSIONS.find(p => p.key === key);
    if (!perm) throw new NotFoundException(`Permission "${key}" not found`);
    if (!['admin', 'admin+moderator'].includes(value)) {
      throw new BadRequestException('Value must be "admin" or "admin+moderator"');
    }
    await this.setSetting(key, value);
    return { key, value };
  }

  async hasPermission(userRole: string, permissionKey: string): Promise<boolean> {
    if (userRole === UserRole.ADMIN) return true;
    if (userRole === UserRole.MODERATOR) {
      const value = await this.getSetting(permissionKey, 'admin');
      return value === 'admin+moderator';
    }
    return false;
  }

  async enforcePermission(userRole: string, permissionKey: string): Promise<void> {
    const permitted = await this.hasPermission(userRole, permissionKey);
    if (!permitted) throw new ForbiddenException('Access denied. You do not have the required permission.');
  }
}
