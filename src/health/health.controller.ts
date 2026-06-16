import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { Response } from 'express';

/**
 * Liveness/readiness probe for load balancers and uptime monitors.
 *
 * Returns 200 with `database: "up"` when the DB responds, otherwise 503 with
 * `database: "down"` so an orchestrator can pull the instance out of rotation.
 * The status is set without throwing, so a DB blip doesn't flood Sentry. Exempt
 * from rate limiting so frequent probes are never throttled.
 */
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    let database = 'up';
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      database = 'down';
    }

    if (database !== 'up') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database,
    };
  }
}
