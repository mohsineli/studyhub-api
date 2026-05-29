import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { Note } from './entities/note.entity';
import { NoteReaction } from './entities/note-reaction.entity';
import { User } from '../users/entities/user.entity';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [TypeOrmModule.forFeature([Note, NoteReaction, User]), AdminModule],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
