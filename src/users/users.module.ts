import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { AdminModule } from '../admin/admin.module';
import { Session } from '../auth/entities/session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Session]), AdminModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
