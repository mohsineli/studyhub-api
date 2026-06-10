import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bookmark } from '../../bookmarks/entities/bookmark.entity';
import { IBookmarkRepository } from './bookmark-repository.interface';

@Injectable()
export class BookmarkRepository implements IBookmarkRepository {
  constructor(
    @InjectRepository(Bookmark) private readonly repo: Repository<Bookmark>,
  ) {}

  create(data: Partial<Bookmark>): Bookmark {
    return this.repo.create(data);
  }

  async save(bookmark: Bookmark): Promise<Bookmark> {
    return this.repo.save(bookmark);
  }

  async findOne(options: { where: any }): Promise<Bookmark | null> {
    return this.repo.findOne(options as any);
  }

  async find(options: { where: any; relations?: string[]; order?: any }): Promise<Bookmark[]> {
    return this.repo.find(options as any);
  }

  async remove(bookmark: Bookmark): Promise<Bookmark> {
    return this.repo.remove(bookmark);
  }

  createQueryBuilder(alias: string) {
    return this.repo.createQueryBuilder(alias);
  }
}
