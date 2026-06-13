import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushToken } from './push-token.entity';
import { PushTokensService } from './push-tokens.service';
import { PushTokensController } from './push-tokens.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PushToken])],
  controllers: [PushTokensController],
  providers: [PushTokensService],
  exports: [PushTokensService],
})
export class PushTokensModule {}
