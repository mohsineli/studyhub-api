import { Controller, Post, Delete, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth';
import type { AuthenticatedRequest } from '../../auth';
import { PushTokensService } from './push-tokens.service';

@Controller('push-tokens')
@UseGuards(JwtAuthGuard)
export class PushTokensController {
  constructor(private readonly pushTokensService: PushTokensService) {}

  @Post()
  async register(
    @Req() req: AuthenticatedRequest,
    @Body() body: { token: string; platform: string },
  ) {
    await this.pushTokensService.upsert(req.user.id, body.token, body.platform);
    return { success: true };
  }

  @Delete()
  async unregister(
    @Req() req: AuthenticatedRequest,
    @Body() body: { token: string },
  ) {
    await this.pushTokensService.removeByToken(body.token);
    return { success: true };
  }
}
