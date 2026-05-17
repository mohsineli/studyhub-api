import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @IsString()
  @IsNotEmpty({ message: 'Comment cannot be empty.' })
  @MaxLength(1000, { message: 'Comment is too long.' })
  comment: string;
}
