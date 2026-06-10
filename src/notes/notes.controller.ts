import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ParseIntPipe, Query } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Request } from 'express';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import type { AuthenticatedRequest } from '../auth';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { NoteStatus } from './entities/note.entity';
import { Public } from '../auth/public.decorator';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(
    private readonly notesService: NotesService,
    @InjectQueue('moderation') private moderationQueue: Queue,
  ) {}

  @Post()
  create(@Body() createNoteDto: CreateNoteDto, @Req() req: AuthenticatedRequest) {
    return this.notesService.create(createNoteDto, req.user.id);
  }

  @Get()
  @Public()
  findAll(
    @Query('sort') sort?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.notesService.findAll(sort, page, limit, search);
  }

  @Get('my-notes')
  findMyNotes(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notesService.findMyNotes(req.user.id, page, limit);
  }

  @Get('trending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  findTrending() {
    return this.notesService.findTrending();
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  findPending(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notesService.findPending(page, limit);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: NoteStatus,
    @Req() req: AuthenticatedRequest,
  ) {
    const note = await this.notesService.findOne(id);
    const job = await this.moderationQueue.add('update-status', {
      type: 'note',
      itemId: id,
      newStatus: status,
      adminId: req.user.id,
      adminRole: req.user.role,
      itemTitle: note.title,
      uploaderId: note.uploader_id,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    return { queued: true, jobId: job.id };
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notesService.findOneCached(id);
  }

  @Post(':id/reactions')
  toggleReaction(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReactionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.notesService.toggleReaction(req.user.id, id, dto.reaction);
  }

  @Get(':id/reactions')
  @Public()
  getReactions(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.notesService.getReactionSummary(id, (req as any).user?.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNoteDto: UpdateNoteDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.notesService.update(id, updateNoteDto, req.user);
  }

  @Post(':id/download')
  incrementDownload(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.notesService.incrementDownload(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.notesService.remove(id, req.user);
  }
}
