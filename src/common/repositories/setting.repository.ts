import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../../admin/entities/setting.entity';
import { ISettingRepository } from './setting-repository.interface';

@Injectable()
export class SettingRepository implements ISettingRepository {
  constructor(
    @InjectRepository(Setting) private readonly repo: Repository<Setting>,
  ) {}

  create(data: Partial<Setting>): Setting {
    return this.repo.create(data);
  }

  async save(setting: Setting): Promise<Setting> {
    return this.repo.save(setting);
  }

  async findOne(options: { where: any }): Promise<Setting | null> {
    return this.repo.findOne(options as any);
  }
}
