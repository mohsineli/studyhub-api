import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ILike } from 'typeorm';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Note, NoteStatus } from './entities/note.entity';
import { RedisService } from '../redis/redis.service';
import { NoteDownloadedEvent, NoteStatusChangedEvent } from '../common/events/index';
import { CACHE_KEYS } from '../common/constants/cache-keys';
import { CACHE_TTL, TOP_N, PAGINATION } from '../common/constants/defaults';
import { buildPagination } from '../common/pagination/pagination.helper';
import { NoteRepository } from '../common/repositories/note.repository';
import { NoteReactionRepository } from '../common/repositories/note-reaction.repository';

@Injectable()
export class NotesService {
  constructor(
    private readonly noteRepository: NoteRepository,
    private readonly noteReactionRepository: NoteReactionRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly redisService: RedisService,
  ) {}

  async create(createNoteDto: CreateNoteDto, uploaderId: number) {
    const note = this.noteRepository.create({
      ...createNoteDto,
      uploader_id: uploaderId,
    });
    const saved = await this.noteRepository.save(note);
    await this.redisService.delByPattern(CACHE_KEYS.NOTES_PATTERN);
    return saved;
  }

  async findAll(sort?: string, page?: number, limit?: number, search?: string) {
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

    const { take, skip } = buildPagination(page, limit);

    // When search is provided (2+ chars), query across title, courseTitle, code, dept
    if (search && search.length >= 2) {
      const [data, total] = await this.noteRepository.findAndCount({
        where: [
          { title: ILike(`%${search}%`), status: NoteStatus.APPROVED },
          { courseTitle: ILike(`%${search}%`), status: NoteStatus.APPROVED },
          { code: ILike(`%${search}%`), status: NoteStatus.APPROVED },
          { dept: ILike(`%${search}%`), status: NoteStatus.APPROVED },
        ],
        relations: ['uploader'],
        order,
        take,
        skip,
      });

      return { data, total, page: page || 1, limit: take };
    }

    const cacheKey = CACHE_KEYS.NOTES_ALL(sort, page, limit);

    return this.redisService.wrap(cacheKey, CACHE_TTL.NOTES_LIST, async () => {
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
    return this.redisService.wrap(CACHE_KEYS.NOTES_TRENDING, CACHE_TTL.NOTES_TRENDING, async () => {
      return await this.noteRepository.find({
        where: { status: NoteStatus.APPROVED },
        relations: ['uploader'],
        order: {
          downloads: 'DESC',
        },
        take: TOP_N.TRENDING_NOTES,
      });
    });
  }

  async findMyNotes(uploaderId: number, page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT) {
    const cacheKey = CACHE_KEYS.NOTES_MY(uploaderId, page, limit);
    return this.redisService.wrap(cacheKey, CACHE_TTL.NOTES_SEARCH, async () => {
      const { take, skip } = buildPagination(page, limit);

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
    return this.redisService.wrap(CACHE_KEYS.NOTES_ONE(id), CACHE_TTL.NOTE_DETAIL, () => this.findOne(id));
  }

  async update(id: number, updateNoteDto: UpdateNoteDto, user: any) {
    const note = await this.findOne(id);
    if (note.uploader_id !== user.id && user.role !== 'admin' && user.role !== 'moderator') {
      throw new ForbiddenException('You do not have permission to update this note');
    }
    Object.assign(note, updateNoteDto);
    await this.noteRepository.save(note);
    await this.redisService.delByPattern(CACHE_KEYS.NOTES_PATTERN);
    return note;
  }

  async incrementView(id: number) {
    const note = await this.findOne(id);
    note.views += 1;
    await this.noteRepository.save(note);
    await this.redisService.delByPattern(CACHE_KEYS.NOTES_PATTERN);
    return note;
  }

  async incrementDownload(id: number, downloaderId?: number) {
    const note = await this.findOne(id);
    note.downloads += 1;
    await this.noteRepository.save(note);

    await this.eventEmitter.emitAsync('note.downloaded', new NoteDownloadedEvent(id, downloaderId, note.uploader_id));

    await this.redisService.delByPattern(CACHE_KEYS.NOTES_PATTERN);

    return note;
  }

  async remove(id: number, user: any) {
    const note = await this.findOne(id);
    if (note.uploader_id !== user.id && user.role !== 'admin' && user.role !== 'moderator') {
      throw new ForbiddenException('You do not have permission to delete this note');
    }
    const result = await this.noteRepository.remove(note);
    await this.redisService.delByPattern(CACHE_KEYS.NOTES_PATTERN);
    await this.redisService.delByPattern(CACHE_KEYS.LEADERBOARD_PATTERN);
    return result;
  }

  async findPending(page?: number, limit?: number) {
    const { take, skip } = buildPagination(page, limit);

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
    const note = await this.findOne(id);
    note.status = status;
    await this.noteRepository.save(note);

    await this.eventEmitter.emitAsync('note.status-changed', new NoteStatusChangedEvent(id, note.title, note.uploader_id, status));

    await this.redisService.delByPattern(CACHE_KEYS.NOTES_PATTERN);

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
