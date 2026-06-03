import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NoteReaction } from '../../notes/entities/note-reaction.entity';
import { INoteReactionRepository } from './note-reaction-repository.interface';

@Injectable()
export class NoteReactionRepository implements INoteReactionRepository {
  constructor(
    @InjectRepository(NoteReaction) private readonly repo: Repository<NoteReaction>,
  ) {}

  async findOne(options: { where: any }): Promise<NoteReaction | null> {
    return this.repo.findOne(options as any);
  }

  async find(options: { where: any }): Promise<NoteReaction[]> {
    return this.repo.find(options as any);
  }

  async save(reaction: Partial<NoteReaction>): Promise<NoteReaction> {
    return this.repo.save(reaction);
  }

  async remove(reaction: NoteReaction): Promise<NoteReaction> {
    return this.repo.remove(reaction);
  }
}
