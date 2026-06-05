import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class GetUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  key: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contentType: string;
}
