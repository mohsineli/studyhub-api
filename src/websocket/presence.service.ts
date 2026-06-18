import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

export type ClientPlatform = 'web' | 'android' | 'ios';
const VALID_PLATFORMS: ClientPlatform[] = ['web', 'android', 'ios'];

export function normalizePlatform(raw: unknown): ClientPlatform {
  return VALID_PLATFORMS.includes(raw as ClientPlatform) ? (raw as ClientPlatform) : 'web';
}

/**
 * Tracks which accounts currently hold a live socket connection, and on which
 * client (web / android / ios). A user can be connected on several clients at
 * once, so each is recorded per-socket and aggregated on read.
 */
@Injectable()
export class PresenceService {
  // socketId -> { userId, platform }
  private readonly sockets = new Map<string, { userId: number; platform: ClientPlatform }>();

  constructor(private readonly usersService: UsersService) {}

  add(socketId: string, userId: number, platform: ClientPlatform): void {
    this.sockets.set(socketId, { userId, platform });
  }

  remove(socketId: string): void {
    this.sockets.delete(socketId);
  }

  // userId -> set of platforms they're currently connected on
  private aggregate(): Map<number, Set<ClientPlatform>> {
    const map = new Map<number, Set<ClientPlatform>>();
    for (const { userId, platform } of this.sockets.values()) {
      if (!map.has(userId)) map.set(userId, new Set());
      map.get(userId)!.add(platform);
    }
    return map;
  }

  /** Live snapshot of online users, grouped by client (web / android / ios). */
  async getOnlineUsers() {
    const agg = this.aggregate();
    const ids = [...agg.keys()];
    const users = ids.length ? await this.usersService.findSummariesByIds(ids) : [];
    const byId = new Map(users.map((u) => [u.id, u]));

    const groups: Record<ClientPlatform, any[]> = { web: [], android: [], ios: [] };
    const appUsers = new Set<number>();

    for (const [userId, platforms] of agg) {
      const info = byId.get(userId);
      if (!info) continue; // user deleted but socket lingering
      const enriched = { ...info, platforms: [...platforms] };
      for (const p of platforms) groups[p].push(enriched);
      if (platforms.has('android') || platforms.has('ios')) appUsers.add(userId);
    }

    return {
      total: agg.size,
      web: { count: groups.web.length, users: groups.web },
      app: {
        count: appUsers.size,
        android: { count: groups.android.length, users: groups.android },
        ios: { count: groups.ios.length, users: groups.ios },
      },
      timestamp: new Date().toISOString(),
    };
  }
}
