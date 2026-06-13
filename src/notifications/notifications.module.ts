import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { Notification } from './entities/notification.entity';
import { PushTokensModule } from './push-tokens/push-tokens.module';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Notification]), ScheduleModule.forRoot(), PushTokensModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushService],
  exports: [NotificationsService, PushService],
})
export class NotificationsModule {}
