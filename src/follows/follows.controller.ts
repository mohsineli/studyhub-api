import { Controller, Get, Post, Delete, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { FollowsService } from './follows.service';
import { JwtAuthGuard } from '../auth';
import type { AuthenticatedRequest } from '../auth';

@Controller('follows')
@UseGuards(JwtAuthGuard)
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Get(':userId/status')
  status(@Param('userId', ParseIntPipe) userId: number, @Req() req: AuthenticatedRequest) {
    return this.followsService.getStatus(userId, req.user.id);
  }

  @Get(':userId/followers')
  followers(@Param('userId', ParseIntPipe) userId: number, @Req() req: AuthenticatedRequest) {
    return this.followsService.followers(userId, req.user.id);
  }

  @Get(':userId/following')
  following(@Param('userId', ParseIntPipe) userId: number, @Req() req: AuthenticatedRequest) {
    return this.followsService.following(userId, req.user.id);
  }

  @Post(':userId/toggle')
  toggle(@Param('userId', ParseIntPipe) userId: number, @Req() req: AuthenticatedRequest) {
    return this.followsService.toggle(userId, req.user.id);
  }

  @Post(':userId')
  follow(@Param('userId', ParseIntPipe) userId: number, @Req() req: AuthenticatedRequest) {
    return this.followsService.follow(userId, req.user.id);
  }

  @Delete(':userId')
  unfollow(@Param('userId', ParseIntPipe) userId: number, @Req() req: AuthenticatedRequest) {
    return this.followsService.unfollow(userId, req.user.id);
  }
}
