import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { LeaderboardService } from './leaderboard.service';
import { ActivityService } from './activity.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import type { AuthenticatedRequest } from '../auth';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly leaderboardService: LeaderboardService,
    private readonly activityService: ActivityService,
  ) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch('profile')
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.MODERATOR)
  updateProfile(@Req() req: AuthenticatedRequest, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateProfile(req.user.id, updateUserDto);
  }

  @Get('leaderboard')
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.MODERATOR)
  getLeaderboard(@Query('period') period?: string) {
    return this.leaderboardService.getLeaderboard(period);
  }

  @Get(':id/public-profile')
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.MODERATOR)
  getPublicProfile(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getPublicProfile(id);
  }

  // --- Admin user management ---

   @Get('active')
   @Roles(UserRole.ADMIN, UserRole.MODERATOR)
   getActiveUsersByDay(
     @Req() req: AuthenticatedRequest,
     @Query('date') date?: string,
     @Query('page') page?: number,
     @Query('limit') limit?: number,
   ) {
     return this.activityService.findActiveUsersByDay(req.user.role, date, page, limit);
   }

   @Get('active/now')
   @Roles(UserRole.ADMIN, UserRole.MODERATOR)
   getCurrentlyActive(
     @Req() req: AuthenticatedRequest,
     @Query('minutes') minutes?: number,
     @Query('page') page?: number,
     @Query('limit') limit?: number,
   ) {
     return this.activityService.findCurrentlyActiveUsers(req.user.role, minutes, page, limit);
   }

  @Post(':id/ban')
  banUser(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.usersService.banUser(id, req.user.id);
  }

  @Post(':id/unban')
  unbanUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.unbanUser(id);
  }

  @Post(':id/promote')
  promoteToModerator(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.usersService.setRole(id, UserRole.MODERATOR, req.user.id);
  }

  @Post(':id/demote')
  demoteToStudent(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.usersService.setRole(id, UserRole.STUDENT, req.user.id);
  }

  // --- Standard CRUD & Directory ---

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.usersService.findAll({
      search,
      limit: limit ? +limit : 20,
      offset: offset ? +offset : 0,
    }, req.user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
