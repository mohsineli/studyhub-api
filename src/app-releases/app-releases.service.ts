import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppRelease } from './entities/app-release.entity';
import { CreateAppReleaseDto } from './dto/create-app-release.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AppReleasesService {
  constructor(
    @InjectRepository(AppRelease)
    private readonly repo: Repository<AppRelease>,
    private readonly storage: StorageService,
  ) {}

  create(dto: CreateAppReleaseDto, uploadedBy: number): Promise<AppRelease> {
    const release = this.repo.create({ ...dto, uploaded_by: uploadedBy });
    return this.repo.save(release);
  }

  // Newest first; the frontend groups these by platform.
  findAll(): Promise<AppRelease[]> {
    return this.repo.find({ order: { created_at: 'DESC' } });
  }

  async remove(id: number): Promise<{ success: boolean }> {
    const release = await this.repo.findOne({ where: { id } });
    if (!release) throw new NotFoundException('Release not found');

    if (release.file_path) {
      // Best-effort: never fail the delete because of a missing R2 object
      try {
        await this.storage.deleteObject(release.file_path);
      } catch {
        /* ignore */
      }
    }

    await this.repo.remove(release);
    return { success: true };
  }
}
