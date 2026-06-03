import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../reviews/entities/review.entity';
import { IReviewRepository } from './review-repository.interface';

@Injectable()
export class ReviewRepository implements IReviewRepository {
  constructor(
    @InjectRepository(Review) private readonly repo: Repository<Review>,
  ) {}

  create(data: Partial<Review>): Review {
    return this.repo.create(data);
  }

  async save(review: Review): Promise<Review> {
    return this.repo.save(review);
  }

  async findOne(options: { where: any; relations?: string[] }): Promise<Review | null> {
    return this.repo.findOne(options as any);
  }

  async find(options: { where: any; relations?: string[]; order?: any }): Promise<Review[]> {
    return this.repo.find(options as any);
  }

  async remove(review: Review): Promise<Review> {
    return this.repo.remove(review);
  }

  async count(options?: { where?: any }): Promise<number> {
    return this.repo.count(options ?? {});
  }

  createQueryBuilder(alias: string) {
    return this.repo.createQueryBuilder(alias);
  }
}
