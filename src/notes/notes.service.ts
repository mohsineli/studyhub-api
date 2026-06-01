import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Note, NoteStatus } from './entities/note.entity';
import { NoteReaction } from './entities/note-reaction.entity';
import { User } from '../users/entities/user.entity';
import { AdminService } from '../admin/admin.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
    @InjectRepository(NoteReaction)
    private readonly noteReactionRepository: Repository<NoteReaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly adminService: AdminService,
    private readonly redisService: RedisService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createNoteDto: CreateNoteDto, uploaderId: number) {
    const note = this.noteRepository.create({
      ...createNoteDto,
      uploader_id: uploaderId,
    });
    const saved = await this.noteRepository.save(note);
    await this.redisService.delByPattern('notes:*');
    return saved;
  }

  async findAll(sort?: string, page?: number, limit?: number) {
    const cacheKey = `notes:${sort || 'latest'}:${page || 1}:${limit || 12}`;

    return this.redisService.wrap(cacheKey, 300, async () => {
      const order: any = {};
      
      switch (sort) {
        case 'top-rated':
          order.avg_rating = 'DESC';
          break;
        case 'most-downloaded':
          order.downloads = 'DESC';
          break;
        default:
          order.created_at = 'DESC';
      }

      const take = limit || 12;
      const skip = page ? (page - 1) * take : 0;

      const [data, total] = await this.noteRepository.findAndCount({
        where: { status: NoteStatus.APPROVED },
        relations: ['uploader'],
        order,
        take,
        skip,
      });

      return { data, total, page: page || 1, limit: take };
    });
  }

  async findTrending(): Promise<Note[]> {
    return this.redisService.wrap('notes:trending', 600, async () => {
      return await this.noteRepository.find({
        where: { status: NoteStatus.APPROVED },
        relations: ['uploader'],
        order: {
          downloads: 'DESC',
        },
        take: 10,
      });
    });
  }

  async findMyNotes(uploaderId: number, page = 1, limit = 12) {
    const cacheKey = `notes:my:${uploaderId}:${page}:${limit}`;
    return this.redisService.wrap(cacheKey, 30, async () => {
      const take = limit;
      const skip = (page - 1) * take;

      const [data, total] = await this.noteRepository.findAndCount({
        where: { uploader_id: uploaderId },
        order: { created_at: 'DESC' },
        take,
        skip,
      });

      return { data, total, page, limit };
    });
  }

  async findOne(id: number) {
    const note = await this.noteRepository.findOne({
      where: { id },
      relations: ['uploader'],
    });
    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }
    return note;
  }

  async findOneCached(id: number) {
    return this.redisService.wrap(`notes:${id}`, 120, () => this.findOne(id));
  }

  async update(id: number, updateNoteDto: UpdateNoteDto, user: any) {
    const note = await this.findOne(id);
    if (note.uploader_id !== user.id && user.role !== 'admin' && user.role !== 'moderator') {
      throw new ForbiddenException('You do not have permission to update this note');
    }
    Object.assign(note, updateNoteDto);
    await this.noteRepository.save(note);
    await this.redisService.delByPattern('notes:*');
    return note;
  }

  async incrementDownload(id: number, downloaderId?: number) {
    const note = await this.findOne(id);
    note.downloads += 1;
    await this.noteRepository.save(note);

    // Points logic: if downloader is not the owner
    if (downloaderId && note.uploader_id !== downloaderId) {
      // +1 point for owner
      await this.userRepository.increment({ id: note.uploader_id }, 'points', 1);
      // +1 point for downloader
      await this.userRepository.increment({ id: downloaderId }, 'points', 1);
      await this.redisService.delByPattern('leaderboard:*');
    }

    await this.redisService.delByPattern('notes:*');

    return note;
  }

  async remove(id: number, user: any) {
    const note = await this.findOne(id);
    if (note.uploader_id !== user.id && user.role !== 'admin' && user.role !== 'moderator') {
      throw new ForbiddenException('You do not have permission to delete this note');
    }
    const result = await this.noteRepository.remove(note);
    await this.redisService.delByPattern('notes:*');
    await this.redisService.delByPattern('leaderboard:*');
    return result;
  }

  async findPending(page?: number, limit?: number) {
    const take = limit || 12;
    const skip = page ? (page - 1) * take : 0;

    const [data, total] = await this.noteRepository.findAndCount({
      where: { status: NoteStatus.PENDING },
      relations: ['uploader'],
      order: { created_at: 'DESC' },
      take,
      skip,
    });

    return { data, total, page: page || 1, limit: take };
  }

  async updateStatus(id: number, status: NoteStatus, userRole?: string) {
    if (userRole && userRole !== 'admin') {
      await this.adminService.enforcePermission(userRole, 'perm_manage_notes');
    }
    const note = await this.findOne(id);
    note.status = status;
    await this.noteRepository.save(note);

    // Reward uploader with 10 points when their note is approved!
    if (status === NoteStatus.APPROVED) {
      await this.userRepository.increment({ id: note.uploader_id }, 'points', 10);
      await this.redisService.delByPattern('leaderboard:*');
      await this.notificationsService.create({
        userId: note.uploader_id,
        type: NotificationType.NOTE_APPROVED,
        title: 'Your note has been approved',
        message: `"${note.title}" has been approved and is now visible to everyone.`,
        entityType: 'note',
        entityId: id,
        redirectUrl: `/notes/${id}`,
      });
    }

    if (status === NoteStatus.REJECTED) {
      await this.notificationsService.create({
        userId: note.uploader_id,
        type: NotificationType.NOTE_REJECTED,
        title: 'Your note has been rejected',
        message: `"${note.title}" was not approved. Please review the guidelines and resubmit.`,
        entityType: 'note',
        entityId: id,
        redirectUrl: `/notes/${id}`,
      });
    }

    await this.redisService.delByPattern('notes:*');

    return note;
  }

  async toggleReaction(userId: number, noteId: number, reaction: string) {
    await this.findOne(noteId);

    const existing = await this.noteReactionRepository.findOne({
      where: { note_id: noteId, user_id: userId },
    });

    if (existing) {
      if (existing.reaction === reaction) {
        await this.noteReactionRepository.remove(existing);
      } else {
        existing.reaction = reaction;
        await this.noteReactionRepository.save(existing);
      }
    } else {
      await this.noteReactionRepository.save({
        note_id: noteId,
        user_id: userId,
        reaction,
      });
    }

    return this.getReactionSummary(noteId, userId);
  }

  async getReactionSummary(noteId: number, userId?: number) {
    const reactions = await this.noteReactionRepository.find({
      where: { note_id: noteId },
    });

    const counts: Record<string, number> = {};
    for (const r of reactions) {
      counts[r.reaction] = (counts[r.reaction] || 0) + 1;
    }

    let userReaction: string | null = null;
    if (userId) {
      const userReact = reactions.find(r => r.user_id === userId);
      userReaction = userReact?.reaction || null;
    }

    return { reactions: counts, userReaction };
  }
}
