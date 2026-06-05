import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../../auth';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { RedisService } from '../../redis/redis.service';

@Controller('moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class ModerationController {
  constructor(private readonly redisService: RedisService) {}

  @Get('jobs/status')
  async getJobStatuses(@Query('ids') ids: string) {
    const jobIds = ids.split(',').filter(Boolean);
    return Promise.all(
      jobIds.map(async (id) => {
        const data = await this.redisService.get<{ status: string; error?: string }>(`moderation:job:${id}`);
        return { jobId: id, status: data?.status || 'processing', error: data?.error };
      }),
    );
  }
}
