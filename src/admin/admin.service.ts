import { Injectable } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { StatsService } from './stats.service';

@Injectable()
export class AdminService {
  constructor(
    readonly settings: SettingsService,
    readonly stats: StatsService,
  ) {}
}
