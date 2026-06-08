import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class WebsocketService {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emitToUser(userId: number, event: string, data: any) {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToModerators(event: string, data: any) {
    if (!this.server) return;
    this.server.to('moderators').emit(event, data);
  }

  emitToAll(event: string, data: any) {
    if (!this.server) return;
    this.server.emit(event, data);
  }
}
