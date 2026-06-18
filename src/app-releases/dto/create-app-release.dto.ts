import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
import { AppPlatform } from '../entities/app-release.entity';

export class CreateAppReleaseDto {
  @IsEnum(AppPlatform)
  platform: AppPlatform;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  file_path: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  file_name?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  file_size?: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
