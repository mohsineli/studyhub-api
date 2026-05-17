import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { Note } from '../notes/entities/note.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
  ) {}

  async submitRating(userId: number, noteId: number, rating: number) {
    const note = await this.noteRepository.findOne({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException(`Note with ID ${noteId} not found`);
    }

    let review = await this.reviewRepository.createQueryBuilder('review')
      .where('review.user_id = :userId', { userId })
      .andWhere('review.note_id = :noteId', { noteId })
      .andWhere('review.rating > 0')
      .getOne();

    if (review) {
      review.rating = rating;
    } else {
      review = this.reviewRepository.create({
        user_id: userId,
        note_id: noteId,
        rating: rating,
        comment: '',
      });
    }

    await this.reviewRepository.save(review);
    await this.updateNoteAverageRating(noteId);
    return review;
  }

  async submitComment(userId: number, noteId: number, comment: string) {
    const note = await this.noteRepository.findOne({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException(`Note with ID ${noteId} not found`);
    }

    const review = this.reviewRepository.create({
      user_id: userId,
      note_id: noteId,
      rating: 0,
      comment: comment,
    });

    await this.reviewRepository.save(review);
    return review;
  }

  async updateById(userId: number, reviewId: number, updateReviewDto: CreateReviewDto) {
    const review = await this.reviewRepository.findOne({ where: { id: reviewId, user_id: userId } });
    if (!review) {
      throw new NotFoundException('Review not found or unauthorized');
    }

    if (updateReviewDto.rating !== undefined) {
      review.rating = updateReviewDto.rating;
    }
    if (updateReviewDto.comment !== undefined) {
      review.comment = updateReviewDto.comment;
    }

    await this.reviewRepository.save(review);
    await this.updateNoteAverageRating(review.note_id);
    return review;
  }

  async findByNote(noteId: number): Promise<Review[]> {
    return await this.reviewRepository.find({
      where: { note_id: noteId },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  async findOneByUserAndNote(userId: number, noteId: number): Promise<Review | null> {
    return await this.reviewRepository.createQueryBuilder('review')
      .where('review.user_id = :userId', { userId })
      .andWhere('review.note_id = :noteId', { noteId })
      .andWhere('review.rating > 0')
      .getOne();
  }

  async remove(userId: number, noteId: number) {
    // Keep this for backwards compatibility just in case
    const review = await this.reviewRepository.findOne({
      where: { user_id: userId, note_id: noteId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.reviewRepository.remove(review);
    await this.updateNoteAverageRating(noteId);

    return { message: 'Review successfully removed' };
  }

  async removeById(userId: number, reviewId: number) {
    const review = await this.reviewRepository.findOne({ where: { id: reviewId, user_id: userId } });
    if (!review) {
      throw new NotFoundException('Review not found or unauthorized');
    }
    const noteId = review.note_id;

    await this.reviewRepository.remove(review);
    await this.updateNoteAverageRating(noteId);
    return { message: 'Review successfully removed' };
  }

  private async updateNoteAverageRating(noteId: number): Promise<void> {
    const ratings = await this.reviewRepository.createQueryBuilder('review')
      .where('review.note_id = :noteId', { noteId })
      .andWhere('review.rating > 0')
      .getMany();

    let avgRating = 0;
    if (ratings.length > 0) {
      const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
      avgRating = sum / ratings.length;
    }

    await this.noteRepository.update({ id: noteId }, { avg_rating: avgRating });
  }
}
