import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushToken } from './push-token.entity';

@Injectable()
export class PushTokensService {
  constructor(
    @InjectRepository(PushToken)
    private readonly pushTokenRepository: Repository<PushToken>,
  ) {}

  async upsert(userId: number, token: string, platform: string): Promise<PushToken> {
    let existing = await this.pushTokenRepository.findOne({
      where: { user_id: userId, token },
    });

    if (existing) {
      existing.platform = platform;
      return this.pushTokenRepository.save(existing);
    }

    const pushToken = this.pushTokenRepository.create({
      user_id: userId,
      token,
      platform,
    });

    return this.pushTokenRepository.save(pushToken);
  }

  async removeByToken(token: string): Promise<void> {
    await this.pushTokenRepository.delete({ token });
  }

  async removeAllForUser(userId: number): Promise<void> {
    await this.pushTokenRepository.delete({ user_id: userId });
  }

  async findByUser(userId: number): Promise<PushToken[]> {
    return this.pushTokenRepository.find({ where: { user_id: userId } });
  }
}
