import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailConsumer } from './email/email.consumer';
import { ModerationConsumer } from './moderation/moderation.consumer';
import { ModerationController } from './moderation/moderation.controller';
import { NotesModule } from '../notes/notes.module';
import { ResourcesModule } from '../resources/resources.module';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
    BullModule.registerQueue({
      name: 'moderation',
    }),
    NotesModule,
    ResourcesModule,
  ],
  controllers: [ModerationController],
  providers: [EmailConsumer, ModerationConsumer],
  exports: [BullModule],
})
export class QueueModule {}
