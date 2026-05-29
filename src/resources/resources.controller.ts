import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ResourceStatus } from './entities/resource.entity';

@Controller('resources')
@UseGuards(JwtAuthGuard)
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  // Any authenticated user can browse approved resources
  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.resourcesService.findAll(page, limit);
  }

  // Admin and moderator can see trending resources
  @Get('trending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  findTrending() {
    return this.resourcesService.findTrending();
  }

  // Admin and moderator can see pending resources
  @Get('admin/pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  findPending(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.resourcesService.findPending(page, limit);
  }

  // Any authenticated user can view a single resource
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.resourcesService.findOne(id);
  }

  // Admin and moderator can upload resources
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  create(@Body() createResourceDto: CreateResourceDto, @Req() req: any) {
    return this.resourcesService.create(createResourceDto, req.user.id);
  }

  // Admin and moderator can approve/reject resources
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: ResourceStatus,
    @Req() req: any,
  ) {
    return this.resourcesService.updateStatus(id, status, req.user.role);
  }

  // Owner, admin, or moderator can edit a resource
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateResourceDto: UpdateResourceDto,
    @Req() req: any,
  ) {
    return this.resourcesService.update(id, updateResourceDto, req.user);
  }

  // Track resource downloads (any authenticated user)
  @Post(':id/download')
  incrementDownload(@Param('id', ParseIntPipe) id: number) {
    return this.resourcesService.incrementDownload(id);
  }

  // Owner, admin, or moderator can delete
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.resourcesService.remove(id, req.user);
  }
}
