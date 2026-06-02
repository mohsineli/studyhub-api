import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { SettingsService } from './settings.service';
import { StatsService } from './stats.service';
import { AnalyticsService } from './analytics.service';
import { AdminController } from './admin.controller';
import { User } from '../users/entities/user.entity';
import { Note } from '../notes/entities/note.entity';
import { Review } from '../reviews/entities/review.entity';
import { Resource } from '../resources/entities/resource.entity';
import { Session } from '../auth/entities/session.entity';
import { Setting } from './entities/setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Note, Review, Resource, Session, Setting])],
  controllers: [AdminController],
  providers: [AdminService, SettingsService, StatsService, AnalyticsService],
  exports: [AdminService, SettingsService, StatsService, AnalyticsService],
})
export class AdminModule {}
