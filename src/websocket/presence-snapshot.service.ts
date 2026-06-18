import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PresenceSnapshot } from './entities/presence-snapshot.entity';
import { PresenceService } from './presence.service';

@Injectable()
export class PresenceSnapshotService {
  constructor(
    @InjectRepository(PresenceSnapshot)
    private readonly repo: Repository<PresenceSnapshot>,
    private readonly presence: PresenceService,
  ) {}

  // Record a point every 10 minutes so we can chart online users over time.
  @Cron(CronExpression.EVERY_10_MINUTES)
  async capture(): Promise<void> {
    const snap = await this.presence.getOnlineUsers();
    await this.repo.insert({
      total: snap.total,
      web: snap.web.count,
      android: snap.app.android.count,
      ios: snap.app.ios.count,
      app: snap.app.count,
    });
  }

  /** Historical snapshots for charts (default last 24h, clamped 1h..90d). */
  history(hours = 24): Promise<PresenceSnapshot[]> {
    const h = Math.min(Math.max(Number(hours) || 24, 1), 24 * 90);
    return this.repo
      .createQueryBuilder('s')
      .where('s.captured_at >= NOW() - make_interval(hours => :h)', { h })
      .orderBy('s.captured_at', 'ASC')
      .getMany();
  }
}
