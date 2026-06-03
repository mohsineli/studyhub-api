import { Review } from '../../reviews/entities/review.entity';

export interface IReviewRepository {
  create(data: Partial<Review>): Review;
  save(review: Review): Promise<Review>;
  findOne(options: { where: any; relations?: string[] }): Promise<Review | null>;
  find(options: { where: any; relations?: string[]; order?: any }): Promise<Review[]>;
  remove(review: Review): Promise<Review>;
  count(options?: { where?: any }): Promise<number>;
  createQueryBuilder(alias: string): any;
}
