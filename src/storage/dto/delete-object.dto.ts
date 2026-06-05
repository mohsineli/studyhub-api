import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class DeleteObjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  key: string;
}
