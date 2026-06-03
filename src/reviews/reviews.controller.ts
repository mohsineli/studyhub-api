import { Controller, Post, Get, Put, Delete, Body, Param, Req, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import type { Request } from 'express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth';
import type { AuthenticatedRequest } from '../auth';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('note/:noteId/rate')
  @UseGuards(JwtAuthGuard)
  submitRating(
    @Param('noteId', ParseIntPipe) noteId: number,
    @Body() body: { rating: number },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.submitRating(req.user.id, noteId, body.rating);
  }

  @Post('note/:noteId/comment')
  @UseGuards(JwtAuthGuard)
  submitComment(
    @Param('noteId', ParseIntPipe) noteId: number,
    @Body() dto: CreateCommentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.submitComment(req.user.id, noteId, dto);
  }

  @Get('note/:noteId')
  findByNote(
    @Param('noteId', ParseIntPipe) noteId: number,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id;
    return this.reviewsService.findByNote(noteId, userId);
  }

  @Get('note/:noteId/me')
  @UseGuards(JwtAuthGuard)
  findOneByUserAndNote(@Param('noteId', ParseIntPipe) noteId: number, @Req() req: AuthenticatedRequest) {
    return this.reviewsService.findOneByUserAndNote(req.user.id, noteId);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  like(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.reviewsService.toggleLike(req.user.id, id, 'like');
  }

  @Post(':id/dislike')
  @UseGuards(JwtAuthGuard)
  dislike(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.reviewsService.toggleLike(req.user.id, id, 'dislike');
  }

  @Delete('note/:noteId')
  @UseGuards(JwtAuthGuard)
  remove(@Param('noteId', ParseIntPipe) noteId: number, @Req() req: AuthenticatedRequest) {
    return this.reviewsService.remove(req.user.id, noteId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCommentDto: UpdateCommentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.updateById(req.user.id, id, updateCommentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  removeById(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.reviewsService.removeById(req.user.id, id);
  }
}
