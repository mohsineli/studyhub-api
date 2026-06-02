import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { StatsService } from './stats.service';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly statsService: StatsService,
    private readonly settingsService: SettingsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('stats')
  getStats() {
    return this.statsService.getStats();
  }

  @Get('active-users')
  getActiveUsers() {
    return this.statsService.getActiveUsers();
  }

  @Get('report')
  getReport() {
    return this.statsService.getReport();
  }

  @Get('settings/:key')
  @Public()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.STUDENT)
  async getSetting(@Param('key') key: string) {
    const fallback = key.includes('theme') ? 'current' : 'approved';
    const value = await this.settingsService.getSetting(key, fallback);
    return { key, value };
  }

  @Post('settings')
  @Roles(UserRole.ADMIN)
  async setSetting(@Body() body: { key: string; value: string }) {
    return this.settingsService.setSetting(body.key, body.value);
  }

  @Get('permissions')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getPermissions() {
    return this.settingsService.getModeratorPermissions();
  }

  @Patch('permissions/:key')
  @Roles(UserRole.ADMIN)
  async setPermission(
    @Param('key') key: string,
    @Body() body: { value: string },
  ) {
    return this.settingsService.setModeratorPermission(key, body.value);
  }

  @Get('analytics/overview')
  async getAnalyticsOverview(@Query('filter') filter: string = 'all') {
    return this.analyticsService.getOverview(filter);
  }

  @Get('analytics/users')
  async getUserAnalytics(@Query('filter') filter: string = 'all') {
    return this.analyticsService.getUserAnalytics(filter);
  }

  @Get('analytics/activity')
  async getActivityAnalytics(@Query('filter') filter: string = 'all') {
    return this.analyticsService.getActivityAnalytics(filter);
  }

  @Get('analytics/content')
  async getContentAnalytics(@Query('filter') filter: string = 'all') {
    return this.analyticsService.getContentAnalytics(filter);
  }
}
