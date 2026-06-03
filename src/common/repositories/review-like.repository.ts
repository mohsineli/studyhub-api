import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewLike } from '../../reviews/entities/review-like.entity';
import { IReviewLikeRepository } from './review-like-repository.interface';

@Injectable()
export class ReviewLikeRepository implements IReviewLikeRepository {
  constructor(
    @InjectRepository(ReviewLike) private readonly repo: Repository<ReviewLike>,
  ) {}

  async findOne(options: { where: any }): Promise<ReviewLike | null> {
    return this.repo.findOne(options as any);
  }

  async find(options: { where: any }): Promise<ReviewLike[]> {
    return this.repo.find(options as any);
  }

  async save(like: Partial<ReviewLike>): Promise<ReviewLike> {
    return this.repo.save(like);
  }

  async remove(like: ReviewLike): Promise<ReviewLike> {
    return this.repo.remove(like);
  }
}
