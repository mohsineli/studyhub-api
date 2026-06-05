import { Controller, Post, Get, Delete, Body, Query, UseGuards, HttpCode } from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';
import { DeleteObjectDto } from './dto/delete-object.dto';

@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Post('upload-url')
  @UseGuards(JwtAuthGuard)
  async getUploadUrl(@Body() dto: GetUploadUrlDto) {
    return this.storageService.getUploadUrl(dto.key, dto.contentType);
  }

  @Delete('objects')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async deleteObject(@Body() dto: DeleteObjectDto) {
    await this.storageService.deleteObject(dto.key);
  }

  @Post('cors-setup')
  @Public()
  @HttpCode(200)
  async setupCors() {
    await this.storageService.setupCors();
    return { message: 'CORS configured successfully' };
  }

  @Get('object')
  @Public()
  async getObject(@Query('key') key: string) {
    return this.storageService.getObjectStream(key);
  }
}
