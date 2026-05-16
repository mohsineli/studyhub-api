import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Note, NoteStatus } from './entities/note.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createNoteDto: CreateNoteDto, uploaderId: number) {
    const note = this.noteRepository.create({
      ...createNoteDto,
      uploader_id: uploaderId,
    });
    return await this.noteRepository.save(note);
  }

  async findAll(sort?: string) {
    const order: any = {};
    
    switch (sort) {
      case 'top-rated':
        order.avg_rating = 'DESC';
        break;
      case 'most-downloaded':
        order.downloads = 'DESC';
        break;
      default:
        order.created_at = 'DESC';
    }

    return await this.noteRepository.find({
      where: { status: NoteStatus.APPROVED },
      relations: ['uploader'],
      order,
    });
  }

  async findOne(id: number) {
    const note = await this.noteRepository.findOne({
      where: { id },
      relations: ['uploader'],
    });
    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }
    return note;
  }

  async update(id: number, updateNoteDto: UpdateNoteDto) {
    const note = await this.findOne(id);
    Object.assign(note, updateNoteDto);
    return await this.noteRepository.save(note);
  }

  async incrementDownload(id: number, downloaderId?: number) {
    const note = await this.findOne(id);
    note.downloads += 1;
    await this.noteRepository.save(note);

    // Points logic: if downloader is not the owner
    if (downloaderId && note.uploader_id !== downloaderId) {
      // +1 point for owner
      await this.userRepository.increment({ id: note.uploader_id }, 'points', 1);
      // +1 point for downloader
      await this.userRepository.increment({ id: downloaderId }, 'points', 1);
    }

    return note;
  }

  async remove(id: number) {
    const note = await this.findOne(id);
    return await this.noteRepository.remove(note);
  }
}
