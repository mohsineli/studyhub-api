export class NoteDownloadedEvent {
  constructor(
    public readonly noteId: number,
    public readonly downloaderId?: number,
    public readonly ownerId?: number,
  ) {}
}
