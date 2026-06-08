import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Note, NoteStatus } from '../notes/entities/note.entity';
import { StorageService } from './storage.service';

@Injectable()
export class CleanupService {
  constructor(
    @InjectRepository(Note) private readonly noteRepository: Repository<Note>,
    private readonly storageService: StorageService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupRejectedNoteFiles(): Promise<void> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const rejectedNotes = await this.noteRepository.find({
      where: {
        status: NoteStatus.REJECTED,
        rejected_at: LessThan(sevenDaysAgo),
      },
      select: ['id', 'file_path'],
    });

    for (const note of rejectedNotes) {
      if (!note.file_path) continue;

      try {
        await this.storageService.deleteObject(note.file_path);
        await this.noteRepository.update(note.id, { file_path: null });
      } catch {
        // file may already be deleted
      }
    }
  }
}
