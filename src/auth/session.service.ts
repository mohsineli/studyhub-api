import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Session } from './entities/session.entity';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SessionService {
  private get sessionDays(): number {
    return this.configService.get<number>('SESSION_DURATION_DAYS', 7);
  }

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async create(userId: number, rawRefreshToken: string, userAgent?: string, ipAddress?: string): Promise<Session> {
    const hashedToken = this.hashToken(rawRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.sessionDays);

    const session = this.sessionRepository.create({
      refresh_token: hashedToken,
      userId,
      user_agent: userAgent,
      ip_address: ipAddress,
      expires_at: expiresAt,
    });
    const saved = await this.sessionRepository.save(session);
    await this.cacheSession(saved, hashedToken);
    return saved;
  }

  async findByToken(userId: number, rawRefreshToken: string): Promise<Session | null> {
    const hashedToken = this.hashToken(rawRefreshToken);
    const cached = await this.getSessionFromCache(userId, hashedToken);
    if (cached) return cached;

    const sessions = await this.sessionRepository.find({ where: { userId } });
    for (const session of sessions) {
      if (session.refresh_token === hashedToken) {
        await this.cacheSession(session, hashedToken);
        return session;
      }
    }
    return null;
  }

  async updateToken(session: Session, newRawRefreshToken: string): Promise<Session> {
    const newHashedToken = this.hashToken(newRawRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.sessionDays);

    session.refresh_token = newHashedToken;
    session.expires_at = expiresAt;

    const saved = await this.sessionRepository.save(session);
    await this.cacheSession(saved, newHashedToken);
    return saved;
  }

  async remove(session: Session, _userId: number, rawRefreshToken: string): Promise<void> {
    const hashedToken = this.hashToken(rawRefreshToken);
    await this.sessionRepository.remove(session);
    await this.removeSessionFromCache(_userId, hashedToken);
  }

  async removeAllByUser(userId: number): Promise<void> {
    await this.sessionRepository.delete({ userId });
    await this.redisService.delByPattern(`session:${userId}:*`);
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sessionKey(userId: number, hashedToken: string): string {
    return `session:${userId}:${hashedToken}`;
  }

  private async cacheSession(session: Session, hashedToken: string): Promise<void> {
    const ttl = this.sessionDays * 24 * 60 * 60;
    await this.redisService.set(this.sessionKey(session.userId, hashedToken), session, ttl);
  }

  private async getSessionFromCache(userId: number, hashedToken: string): Promise<Session | null> {
    return this.redisService.get<Session>(this.sessionKey(userId, hashedToken));
  }

  private async removeSessionFromCache(userId: number, hashedToken: string): Promise<void> {
    await this.redisService.del(this.sessionKey(userId, hashedToken));
  }
}
