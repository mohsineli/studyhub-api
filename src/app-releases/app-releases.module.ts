import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppRelease } from './entities/app-release.entity';
import { AppReleasesService } from './app-releases.service';
import { AppReleasesController } from './app-releases.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([AppRelease]), StorageModule],
  controllers: [AppReleasesController],
  providers: [AppReleasesService],
})
export class AppReleasesModule {}
