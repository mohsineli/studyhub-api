import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from '../../notes/entities/note.entity';
import { INoteRepository } from './note-repository.interface';

@Injectable()
export class NoteRepository implements INoteRepository {
  constructor(
    @InjectRepository(Note) private readonly repo: Repository<Note>,
  ) {}

  create(data: Partial<Note>): Note {
    return this.repo.create(data);
  }

  async save(note: Note): Promise<Note> {
    return this.repo.save(note);
  }

  async findOne(options: { where: any; relations?: string[] }): Promise<Note | null> {
    return this.repo.findOne(options as any);
  }

  async find(options: { where: any; relations?: string[]; order?: any; take?: number }): Promise<Note[]> {
    return this.repo.find(options as any);
  }

  async findAndCount(options: { where: any; relations?: string[]; order?: any; take?: number; skip?: number }): Promise<[Note[], number]> {
    return this.repo.findAndCount(options as any);
  }

  async update(criteria: any, data: any): Promise<any> {
    return this.repo.update(criteria, data);
  }

  async remove(note: Note): Promise<Note> {
    return this.repo.remove(note);
  }

  async count(options?: { where?: any }): Promise<number> {
    return this.repo.count(options ?? {});
  }

  createQueryBuilder(alias: string) {
    return this.repo.createQueryBuilder(alias);
  }
}
