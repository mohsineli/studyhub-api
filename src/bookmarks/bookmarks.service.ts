import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Bookmark } from './entities/bookmark.entity';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { BookmarkRepository } from '../common/repositories/bookmark.repository';

@Injectable()
export class BookmarksService {
  constructor(
    private readonly bookmarkRepository: BookmarkRepository,
  ) {}

  async create(createBookmarkDto: CreateBookmarkDto, userId: number) {
    const { note_id, resource_id, subject_name } = createBookmarkDto;

    // Validate that at least one identifier is provided
    if (!note_id && !resource_id && !subject_name) {
      throw new BadRequestException('Provide at least note_id, resource_id, or subject_name');
    }

    const bookmark = this.bookmarkRepository.create({
      ...createBookmarkDto,
      user_id: userId,
    });

    try {
      return await this.bookmarkRepository.save(bookmark);
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique constraint error code
        throw new ConflictException('This item is already bookmarked');
      }
      throw error;
    }
  }

  async findAllByUser(userId: number, search?: string) {
    if (search && search.length >= 2) {
      return this.bookmarkRepository
        .createQueryBuilder('bookmark')
        .leftJoinAndSelect('bookmark.note', 'note')
        .leftJoinAndSelect('bookmark.resource', 'resource')
        .where('bookmark.user_id = :userId', { userId })
        .andWhere(
          `(bookmark.subject_name ILIKE :search OR note.title ILIKE :search OR note.courseTitle ILIKE :search OR note.code ILIKE :search OR resource.title ILIKE :search OR resource.subject ILIKE :search OR resource.course_code ILIKE :search)`,
          { search: `%${search}%` }
        )
        .orderBy('bookmark.created_at', 'DESC')
        .getMany();
    }

    return await this.bookmarkRepository.find({
      where: { user_id: userId },
      relations: ['note', 'resource'],
      order: { created_at: 'DESC' },
    });
  }

  async remove(id: number, userId: number) {
    const bookmark = await this.bookmarkRepository.findOne({
      where: { id, user_id: userId },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    return await this.bookmarkRepository.remove(bookmark);
  }

  async toggle(createBookmarkDto: CreateBookmarkDto, userId: number) {
    const { note_id, resource_id, subject_name } = createBookmarkDto;

    const existing = await this.bookmarkRepository.findOne({
      where: {
        user_id: userId,
        ...(note_id && { note_id }),
        ...(resource_id && { resource_id }),
        ...(subject_name && { subject_name }),
      },
    });

    if (existing) {
      await this.bookmarkRepository.remove(existing);
      return { bookmarked: false };
    } else {
      await this.create(createBookmarkDto, userId);
      return { bookmarked: true };
    }
  }
}
