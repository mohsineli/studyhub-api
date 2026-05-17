import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

  async findTrending(): Promise<Note[]> {
    return await this.noteRepository.find({
      where: { status: NoteStatus.APPROVED },
      relations: ['uploader'],
      order: {
        downloads: 'DESC',
      },
      take: 10,
    });
  }

  async findMyNotes(uploaderId: number) {
    return await this.noteRepository.find({
      where: { uploader_id: uploaderId },
      order: { created_at: 'DESC' },
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

  async update(id: number, updateNoteDto: UpdateNoteDto, user: any) {
    const note = await this.findOne(id);
    if (note.uploader_id !== user.id && user.role !== 'admin' && user.role !== 'moderator') {
      throw new ForbiddenException('You do not have permission to update this note');
    }
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

  async remove(id: number, user: any) {
    const note = await this.findOne(id);
    if (note.uploader_id !== user.id && user.role !== 'admin' && user.role !== 'moderator') {
      throw new ForbiddenException('You do not have permission to delete this note');
    }
    return await this.noteRepository.remove(note);
  }

  async findPending() {
    return await this.noteRepository.find({
      where: { status: NoteStatus.PENDING },
      relations: ['uploader'],
      order: { created_at: 'DESC' },
    });
  }

  async updateStatus(id: number, status: NoteStatus) {
    const note = await this.findOne(id);
    note.status = status;
    await this.noteRepository.save(note);

    // Reward uploader with 10 points when their note is approved!
    if (status === NoteStatus.APPROVED) {
      await this.userRepository.increment({ id: note.uploader_id }, 'points', 10);
    }

    return note;
  }
}
