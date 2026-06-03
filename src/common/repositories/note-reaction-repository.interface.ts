import { NoteReaction } from '../../notes/entities/note-reaction.entity';

export interface INoteReactionRepository {
  findOne(options: { where: any }): Promise<NoteReaction | null>;
  find(options: { where: any }): Promise<NoteReaction[]>;
  save(reaction: Partial<NoteReaction>): Promise<NoteReaction>;
  remove(reaction: NoteReaction): Promise<NoteReaction>;
}
