import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourcesService } from './resources.service';
import { ResourcesController } from './resources.controller';
import { Resource } from './entities/resource.entity';
import { User } from '../users/entities/user.entity';
import { AdminModule } from '../admin/admin.module';
import { ResourceEventsListener } from '../common/events/resource-events.listener';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Resource, User]),
    AdminModule,
    StorageModule,
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService, ResourceEventsListener],
  exports: [ResourcesService],
})
export class ResourcesModule {}
