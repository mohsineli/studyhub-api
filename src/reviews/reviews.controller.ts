import { Controller, Post, Get, Delete, Body, Param, Req, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('note/:noteId')
  @UseGuards(JwtAuthGuard)
  createOrUpdate(
    @Param('noteId', ParseIntPipe) noteId: number,
    @Body() createReviewDto: CreateReviewDto,
    @Req() req: any,
  ) {
    return this.reviewsService.createOrUpdate(req.user.id, noteId, createReviewDto);
  }

  @Get('note/:noteId')
  findByNote(@Param('noteId', ParseIntPipe) noteId: number) {
    return this.reviewsService.findByNote(noteId);
  }

  @Get('note/:noteId/me')
  @UseGuards(JwtAuthGuard)
  findOneByUserAndNote(@Param('noteId', ParseIntPipe) noteId: number, @Req() req: any) {
    return this.reviewsService.findOneByUserAndNote(req.user.id, noteId);
  }

  @Delete('note/:noteId')
  @UseGuards(JwtAuthGuard)
  remove(@Param('noteId', ParseIntPipe) noteId: number, @Req() req: any) {
    return this.reviewsService.remove(req.user.id, noteId);
  }
}
