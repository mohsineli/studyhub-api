import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AppReleasesService } from './app-releases.service';
import { CreateAppReleaseDto } from './dto/create-app-release.dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import type { AuthenticatedRequest } from '../auth';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('app-releases')
export class AppReleasesController {
  constructor(private readonly service: AppReleasesService) {}

  // Public: the landing page lists available downloads
  @Get()
  @Public()
  findAll() {
    return this.service.findAll();
  }

  // Admin only: register an uploaded build (file already pushed to R2)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateAppReleaseDto, @Req() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.id);
  }

  // Admin only: remove a release and its R2 object
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
