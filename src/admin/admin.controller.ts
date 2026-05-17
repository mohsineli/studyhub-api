import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN) // Restrict controller to Admin by default
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('active-users')
  getActiveUsers() {
    return this.adminService.getActiveUsers();
  }

  @Get('report')
  getReport() {
    return this.adminService.getReport();
  }

  @Get('settings/:key')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getSetting(@Param('key') key: string) {
    const value = await this.adminService.getSetting(key, 'approved');
    return { key, value };
  }

  @Post('settings')
  @Roles(UserRole.ADMIN) // Only Admin can change settings
  async setSetting(@Body() body: { key: string; value: string }) {
    const setting = await this.adminService.setSetting(body.key, body.value);
    return setting;
  }
}
