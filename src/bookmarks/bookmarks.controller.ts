import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { JwtAuthGuard } from '../auth';
import type { AuthenticatedRequest } from '../auth';

@Controller('bookmarks')
@UseGuards(JwtAuthGuard)
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post()
  create(@Body() createBookmarkDto: CreateBookmarkDto, @Req() req: AuthenticatedRequest) {
    return this.bookmarksService.create(createBookmarkDto, req.user.id);
  }

  @Post('toggle')
  toggle(@Body() createBookmarkDto: CreateBookmarkDto, @Req() req: AuthenticatedRequest) {
    return this.bookmarksService.toggle(createBookmarkDto, req.user.id);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.bookmarksService.findAllByUser(req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.bookmarksService.remove(id, req.user.id);
  }
}
