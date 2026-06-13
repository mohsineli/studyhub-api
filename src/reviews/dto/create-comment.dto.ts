import { IsString, IsNotEmpty, IsInt, IsOptional, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty({ message: 'Comment cannot be empty.' })
  @MaxLength(1000, { message: 'Comment is too long.' })
  comment: string;

  @IsInt()
  @IsOptional()
  parent_id?: number;

  @IsInt()
  @IsOptional()
  mentioned_user_id?: number;
}
