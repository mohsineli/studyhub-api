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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch('profile')
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.MODERATOR)
  updateProfile(@Req() req: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateProfile(req.user.id, updateUserDto);
  }

  @Get('leaderboard')
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.MODERATOR)
  getLeaderboard(@Query('period') period?: string) {
    return this.usersService.getLeaderboard(period);
  }

  // --- Admin user management ---

  @Get('active')
  @Roles(UserRole.ADMIN)
  getActiveUsersByDay(@Query('date') date?: string) {
    return this.usersService.findActiveUsersByDay(date);
  }

  @Post(':id/ban')
  banUser(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.usersService.banUser(id, req.user.id);
  }

  @Post(':id/unban')
  unbanUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.unbanUser(id);
  }

  @Post(':id/promote')
  promoteToModerator(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.usersService.setRole(id, UserRole.MODERATOR, req.user.id);
  }

  @Post(':id/demote')
  demoteToStudent(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.usersService.setRole(id, UserRole.STUDENT, req.user.id);
  }

  // --- Standard CRUD & Directory ---

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  findAll(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.usersService.findAll({
      search,
      limit: limit ? +limit : 20,
      offset: offset ? +offset : 0,
    });
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
