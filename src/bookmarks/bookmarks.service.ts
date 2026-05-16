import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bookmark } from './entities/bookmark.entity';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';

@Injectable()
export class BookmarksService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
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

  async findAllByUser(userId: number) {
    return await this.bookmarkRepository.find({
      where: { user_id: userId },
      relations: ['note'],
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
