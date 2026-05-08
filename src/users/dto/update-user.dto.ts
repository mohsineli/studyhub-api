import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  otp?: string;
  otp_expires_at?: Date;
  verified?: boolean;
  password?: string;
  refresh_token?: string;
}
