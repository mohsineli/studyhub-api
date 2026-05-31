import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { AdminModule } from '../admin/admin.module';
import { Session } from '../auth/entities/session.entity';
import { Setting } from '../admin/entities/setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Session, Setting]), AdminModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
