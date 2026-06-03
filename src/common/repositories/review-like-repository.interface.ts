import { ReviewLike } from '../../reviews/entities/review-like.entity';

export interface IReviewLikeRepository {
  findOne(options: { where: any }): Promise<ReviewLike | null>;
  find(options: { where: any }): Promise<ReviewLike[]>;
  save(like: Partial<ReviewLike>): Promise<ReviewLike>;
  remove(like: ReviewLike): Promise<ReviewLike>;
}
