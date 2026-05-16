import { IsOptional, IsNumber, IsString, MaxLength } from 'class-validator';

export class CreateBookmarkDto {
  @IsOptional()
  @IsNumber()
  note_id?: number;

  @IsOptional()
  @IsNumber()
  resource_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject_name?: string;
}
