import { IsString, IsNotEmpty, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { ResourceTerm } from '../entities/resource.entity';

export class CreateResourceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  subject?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  course_code?: string;

  @IsEnum(ResourceTerm)
  @IsOptional()
  term?: ResourceTerm;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  file_path: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  file_type?: string;
}
