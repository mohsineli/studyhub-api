import { IsString, IsNotEmpty, IsIn } from 'class-validator';

const REACTIONS = ['👍', '❤️', '😄', '😮', '😢'];

export class CreateReactionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(REACTIONS, { message: 'Invalid reaction type' })
  reaction: string;
}
