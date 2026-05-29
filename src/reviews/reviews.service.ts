import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Review } from './entities/review.entity';
import { ReviewLike } from './entities/review-like.entity';
import { Note } from '../notes/entities/note.entity';
import { User } from '../users/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(ReviewLike)
    private readonly reviewLikeRepository: Repository<ReviewLike>,
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async submitRating(userId: number, noteId: number, rating: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user?.banned) {
      throw new ForbiddenException('Banned users cannot submit ratings.');
    }

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

  async submitComment(userId: number, noteId: number, dto: CreateCommentDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user?.banned) {
      throw new ForbiddenException('Banned users cannot post comments.');
    }

    const note = await this.noteRepository.findOne({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException(`Note with ID ${noteId} not found`);
    }

    if (dto.parent_id) {
      const parent = await this.reviewRepository.findOne({ where: { id: dto.parent_id, note_id: noteId } });
      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const review = this.reviewRepository.create({
      user_id: userId,
      note_id: noteId,
      rating: 0,
      comment: dto.comment,
      parent_id: dto.parent_id || null,
    });

    await this.reviewRepository.save(review);
    return review;
  }

  async updateById(userId: number, reviewId: number, updateCommentDto: UpdateCommentDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user?.banned) {
      throw new ForbiddenException('Banned users cannot update comments.');
    }

    const review = await this.reviewRepository.findOne({ where: { id: reviewId, user_id: userId } });
    if (!review) {
      throw new NotFoundException('Review not found or unauthorized');
    }

    review.comment = updateCommentDto.comment;

    await this.reviewRepository.save(review);
    await this.updateNoteAverageRating(review.note_id);
    return review;
  }

  async findByNote(noteId: number, currentUserId?: number): Promise<any[]> {
    const reviews = await this.reviewRepository.find({
      where: { note_id: noteId, parent_id: IsNull() },
      relations: ['user', 'children', 'children.user'],
      order: { created_at: 'DESC' },
    });

    const result = reviews.map(review => ({
      ...review,
      children: (review.children || []).sort((a, b) => a.created_at.getTime() - b.created_at.getTime()),
    }));

    if (currentUserId) {
      const allReviewIds = this.collectReviewIds(reviews);
      if (allReviewIds.length > 0) {
        const votes = await this.reviewLikeRepository.find({
          where: { review_id: In(allReviewIds), user_id: currentUserId },
        });
        const voteMap = new Map(votes.map(v => [v.review_id, v.type]));
        this.attachVotes(reviews, voteMap);
      }
    }

    return result;
  }

  private collectReviewIds(reviews: Review[]): number[] {
    const ids: number[] = [];
    for (const r of reviews) {
      ids.push(r.id);
      if (r.children) {
        for (const c of r.children) {
          ids.push(c.id);
        }
      }
    }
    return ids;
  }

  private attachVotes(reviews: any[], voteMap: Map<number, string>) {
    for (const r of reviews) {
      r.userVote = voteMap.get(r.id) || null;
      if (r.children) {
        for (const c of r.children) {
          c.userVote = voteMap.get(c.id) || null;
        }
      }
    }
  }

  async toggleLike(userId: number, reviewId: number, type: 'like' | 'dislike') {
    const review = await this.reviewRepository.findOne({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const existing = await this.reviewLikeRepository.findOne({
      where: { review_id: reviewId, user_id: userId },
    });

    if (existing) {
      if (existing.type === type) {
        // Remove vote (toggle off)
        await this.reviewLikeRepository.remove(existing);
        if (type === 'like') {
          review.likes_count = Math.max(0, review.likes_count - 1);
        } else {
          review.dislikes_count = Math.max(0, review.dislikes_count - 1);
        }
      } else {
        // Switch vote
        existing.type = type;
        await this.reviewLikeRepository.save(existing);
        if (type === 'like') {
          review.likes_count += 1;
          review.dislikes_count = Math.max(0, review.dislikes_count - 1);
        } else {
          review.dislikes_count += 1;
          review.likes_count = Math.max(0, review.likes_count - 1);
        }
      }
    } else {
      // New vote
      await this.reviewLikeRepository.save({
        review_id: reviewId,
        user_id: userId,
        type,
      });
      if (type === 'like') {
        review.likes_count += 1;
      } else {
        review.dislikes_count += 1;
      }
    }

    await this.reviewRepository.save(review);
    return { likes_count: review.likes_count, dislikes_count: review.dislikes_count, userVote: existing && existing.type !== type ? type : (existing ? null : type) };
  }

  async findOneByUserAndNote(userId: number, noteId: number): Promise<Review | null> {
    return await this.reviewRepository.createQueryBuilder('review')
      .where('review.user_id = :userId', { userId })
      .andWhere('review.note_id = :noteId', { noteId })
      .andWhere('review.rating > 0')
      .getOne();
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
