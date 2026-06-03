import { Setting } from '../../admin/entities/setting.entity';

export interface ISettingRepository {
  create(data: Partial<Setting>): Setting;
  save(setting: Setting): Promise<Setting>;
  findOne(options: { where: any }): Promise<Setting | null>;
}
