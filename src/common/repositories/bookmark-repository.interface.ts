import { Bookmark } from '../../bookmarks/entities/bookmark.entity';

export interface IBookmarkRepository {
  create(data: Partial<Bookmark>): Bookmark;
  save(bookmark: Bookmark): Promise<Bookmark>;
  findOne(options: { where: any }): Promise<Bookmark | null>;
  find(options: { where: any; relations?: string[]; order?: any }): Promise<Bookmark[]>;
  remove(bookmark: Bookmark): Promise<Bookmark>;
}
