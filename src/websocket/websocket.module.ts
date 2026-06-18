import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { PresenceService } from './presence.service';
import { PresenceSnapshotService } from './presence-snapshot.service';
import { PresenceSnapshot } from './entities/presence-snapshot.entity';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [JwtModule, UsersModule, TypeOrmModule.forFeature([PresenceSnapshot])],
  providers: [WebsocketGateway, WebsocketService, PresenceService, PresenceSnapshotService],
  exports: [WebsocketService, PresenceService, PresenceSnapshotService],
})
export class WebsocketModule {}
