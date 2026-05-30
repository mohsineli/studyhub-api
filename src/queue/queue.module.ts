import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailConsumer } from './email/email.consumer';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [EmailConsumer],
  exports: [BullModule],
})
export class QueueModule {}
