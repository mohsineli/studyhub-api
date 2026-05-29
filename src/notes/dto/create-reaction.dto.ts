import { IsString, IsNotEmpty, IsIn } from 'class-validator';

const REACTIONS = ['helpful', 'brilliant', 'insightful', 'creative', 'lifesaver'];

export class CreateReactionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(REACTIONS, { message: 'Invalid reaction type' })
  reaction: string;
}
