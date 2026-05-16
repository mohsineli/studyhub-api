import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  courseTitle: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  dept: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  file_path: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  file_type: string;
}
