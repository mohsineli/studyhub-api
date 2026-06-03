import { Note } from '../../notes/entities/note.entity';

export interface INoteRepository {
  create(data: Partial<Note>): Note;
  save(note: Note): Promise<Note>;
  findOne(options: { where: any; relations?: string[] }): Promise<Note | null>;
  find(options: { where: any; relations?: string[]; order?: any; take?: number }): Promise<Note[]>;
  findAndCount(options: { where: any; relations?: string[]; order?: any; take?: number; skip?: number }): Promise<[Note[], number]>;
  update(criteria: any, data: any): Promise<any>;
  remove(note: Note): Promise<Note>;
  count(options?: { where?: any }): Promise<number>;
  createQueryBuilder(alias: string): any;
}
