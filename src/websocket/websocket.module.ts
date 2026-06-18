import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { PresenceService } from './presence.service';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [JwtModule, UsersModule],
  providers: [WebsocketGateway, WebsocketService, PresenceService],
  exports: [WebsocketService, PresenceService],
})
export class WebsocketModule {}
