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

  async createOrUpdate(userId: number, noteId: number, createReviewDto: CreateReviewDto) {
    const note = await this.noteRepository.findOne({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException(`Note with ID ${noteId} not found`);
    }

    if (note.uploader_id === userId) {
      throw new BadRequestException('You cannot rate your own note.');
    }

    let review = await this.reviewRepository.findOne({
      where: { user_id: userId, note_id: noteId },
    });

    if (review) {
      review.rating = createReviewDto.rating;
      review.comment = createReviewDto.comment;
    } else {
      review = this.reviewRepository.create({
        user_id: userId,
        note_id: noteId,
        rating: createReviewDto.rating,
        comment: createReviewDto.comment,
      });
    }

    await this.reviewRepository.save(review);

    // Recalculate average rating for the note
    await this.updateNoteAverageRating(noteId);

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
    return await this.reviewRepository.findOne({
      where: { user_id: userId, note_id: noteId },
    });
  }

  async remove(userId: number, noteId: number) {
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

  private async updateNoteAverageRating(noteId: number): Promise<void> {
    const ratings = await this.reviewRepository.find({
      where: { note_id: noteId },
    });

    let avgRating = 0;
    if (ratings.length > 0) {
      const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
      avgRating = sum / ratings.length;
    }

    await this.noteRepository.update({ id: noteId }, { avg_rating: avgRating });
  }
}
