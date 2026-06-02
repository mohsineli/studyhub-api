import { NoteStatus } from '../../notes/entities/note.entity';

export class NoteStatusChangedEvent {
  constructor(
    public readonly noteId: number,
    public readonly title: string,
    public readonly uploaderId: number,
    public readonly status: NoteStatus,
  ) {}
}
