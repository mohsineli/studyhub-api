import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MailService } from './mail.service';
import { MailQueueProcessor } from './mail-queue.processor';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({ name: 'mail' }),
  ],
  providers: [MailService, MailQueueProcessor],
  exports: [MailService],
})
export class MailModule {}
