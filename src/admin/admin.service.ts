import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Note, NoteStatus } from '../notes/entities/note.entity';
import { Review } from '../reviews/entities/review.entity';
import { Resource } from '../resources/entities/resource.entity';
import { Session } from '../auth/entities/session.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Note) private noteRepository: Repository<Note>,
    @InjectRepository(Review) private reviewRepository: Repository<Review>,
    @InjectRepository(Resource) private resourceRepository: Repository<Resource>,
    @InjectRepository(Session) private sessionRepository: Repository<Session>,
  ) {}

  async getStats() {
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
}
