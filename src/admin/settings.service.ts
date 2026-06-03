import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/entities/user.entity';
import { Setting } from './entities/setting.entity';
import { RedisService } from '../redis/redis.service';
import { CACHE_KEYS } from '../common/constants/cache-keys';
import { CACHE_TTL } from '../common/constants/defaults';

export const MODERATOR_PERMISSIONS = [
  { key: 'perm_view_active_users', label: 'Active Users', description: 'View active user statistics' },
  { key: 'perm_view_users', label: 'User Directory', description: 'View registered users directory' },
  { key: 'perm_view_resources', label: 'Library Resources', description: 'View library resources list' },
];

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting) private readonly settingRepository: Repository<Setting>,
    private readonly redisService: RedisService,
  ) {}

  async getSetting(key: string, defaultValue: string): Promise<string> {
    return this.redisService.wrap(CACHE_KEYS.ADMIN_SETTING(key), CACHE_TTL.ADMIN_SETTING, async () => {
      const setting = await this.settingRepository.findOne({ where: { key } });
      if (!setting) {
        const newSetting = this.settingRepository.create({ key, value: defaultValue });
        await this.settingRepository.save(newSetting);
        return defaultValue;
      }
      return setting.value;
    });
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    let setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting) {
      setting = this.settingRepository.create({ key, value });
    } else {
      setting.value = value;
    }
    const saved = await this.settingRepository.save(setting);
    await this.redisService.delByPattern(CACHE_KEYS.ADMIN_SETTING(key));
    return saved;
  }

  async getModeratorPermissions() {
    return this.redisService.wrap(CACHE_KEYS.ADMIN_PERMISSIONS, CACHE_TTL.ADMIN_PERMISSIONS, async () => {
      const results: { key: string; label: string; description: string; value: string }[] = [];
      for (const perm of MODERATOR_PERMISSIONS) {
        const value = await this.getSetting(perm.key, 'admin');
        results.push({ ...perm, value });
      }
      return results;
    });
  }

  async setModeratorPermission(key: string, value: string) {
    const perm = MODERATOR_PERMISSIONS.find(p => p.key === key);
    if (!perm) throw new NotFoundException(`Permission "${key}" not found`);
    if (!['admin', 'admin+moderator'].includes(value)) {
      throw new BadRequestException('Value must be "admin" or "admin+moderator"');
    }
    await this.setSetting(key, value);
    await this.redisService.delByPattern(CACHE_KEYS.ADMIN_PERMISSIONS);
    return { key, value };
  }

  async hasPermission(userRole: string, permissionKey: string): Promise<boolean> {
    if (userRole === UserRole.ADMIN) return true;
    if (userRole === UserRole.MODERATOR) {
      const value = await this.getSetting(permissionKey, 'admin');
      return value === 'admin+moderator';
    }
    return false;
  }

  async enforcePermission(userRole: string, permissionKey: string): Promise<void> {
    const permitted = await this.hasPermission(userRole, permissionKey);
    if (!permitted) throw new ForbiddenException('Access denied. You do not have the required permission.');
  }
}
