import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { CleanupService } from './cleanup.service';
import { Note } from '../notes/entities/note.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Note])],
  controllers: [StorageController],
  providers: [StorageService, CleanupService],
  exports: [StorageService],
})
export class StorageModule {}
