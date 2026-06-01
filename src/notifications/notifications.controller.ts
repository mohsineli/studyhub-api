import {
  Controller, Get, Patch, Delete, Param, Query, Body, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { Request } from 'express';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findByUser(req.user.id, {
      page: page || 1,
      limit: limit || 20,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    const notification = await this.notificationsService.markAsRead(+id, req.user.id);
    if (!notification) return { success: false };
    return { success: true, notification };
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true };
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    const deleted = await this.notificationsService.delete(+id, req.user.id);
    return { success: deleted };
  }
}
