import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WebsocketService } from './websocket.service';
import { ActivityService } from '../users/activity.service';

const LIVE_ACTIVE_USERS_INTERVAL_MS = 5000;
const LIVE_MINUTES = 5;
const LIVE_LIMIT = 50;

@Injectable()
@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/',
})
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private liveInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly websocketService: WebsocketService,
    private readonly activityService: ActivityService,
  ) {}

  afterInit(server: Server) {
    this.websocketService.setServer(server);
    this.startLiveActiveUsersPush();
  }

  onModuleDestroy() {
    if (this.liveInterval) {
      clearInterval(this.liveInterval);
      this.liveInterval = null;
    }
  }

  private startLiveActiveUsersPush() {
    this.liveInterval = setInterval(async () => {
      try {
        const server = this.websocketService['server'];
        if (!server) return;
        const modRoom = server.sockets.adapter.rooms?.get('moderators');
        if (!modRoom || modRoom.size === 0) return;

        const result = await this.activityService.findCurrentlyActiveUsers('admin', LIVE_MINUTES, 1, LIVE_LIMIT);
        this.websocketService.emitToModerators('live-users:updated', {
          data: result.data,
          total: result.total,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // silently retry on next interval
      }
    }, LIVE_ACTIVE_USERS_INTERVAL_MS);
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token as string;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      const userId = payload.sub;
      const role = payload.role;

      client.data.userId = userId;
      client.data.role = role;

      client.join(`user:${userId}`);
      if (role === 'admin' || role === 'moderator') {
        client.join('moderators');
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
  }
}
