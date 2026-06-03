import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource, ResourceStatus } from './entities/resource.entity';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { SettingsService } from '../admin/settings.service';
import { RedisService } from '../redis/redis.service';
import { CACHE_KEYS } from '../common/constants/cache-keys';
import { buildPagination } from '../common/pagination/pagination.helper';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
    private readonly settingsService: SettingsService,
    private readonly redisService: RedisService,
  ) {}

  async create(createResourceDto: CreateResourceDto, uploaderId: number): Promise<Resource> {
    // Check global setting 'resource_upload_visibility'
    const visibility = await this.settingsService.getSetting('resource_upload_visibility', 'approved');
    const status = visibility === 'pending' ? ResourceStatus.PENDING : ResourceStatus.APPROVED;

    const resource = this.resourceRepository.create({
      ...createResourceDto,
      uploader_id: uploaderId,
      status,
    });
    const saved = await this.resourceRepository.save(resource);
    await this.redisService.delByPattern(CACHE_KEYS.RESOURCES_PATTERN);
    return saved;
  }

  async findAll(page?: number, limit?: number) {
    const cacheKey = CACHE_KEYS.RESOURCES_ALL(page, limit);

    return this.redisService.wrap(cacheKey, 300, async () => {
      const { take, skip } = buildPagination(page, limit);

      const [data, total] = await this.resourceRepository.findAndCount({
        where: { status: ResourceStatus.APPROVED },
        relations: ['uploader'],
        order: { created_at: 'DESC' },
        take,
        skip,
      });

      return { data, total, page: page || 1, limit: take };
    });
  }

  async findPending(page?: number, limit?: number) {
    const { take, skip } = buildPagination(page, limit);

    const [data, total] = await this.resourceRepository.findAndCount({
      where: { status: ResourceStatus.PENDING },
      relations: ['uploader'],
      order: { created_at: 'DESC' },
      take,
      skip,
    });

    return { data, total, page: page || 1, limit: take };
  }

  async findCourses(page: number = 1, limit: number = 12) {
    const cacheKey = CACHE_KEYS.RESOURCES_COURSES(page, limit);

    return this.redisService.wrap(cacheKey, 300, async () => {
      const { take, skip } = buildPagination(page, limit);

      const data = await this.resourceRepository
        .createQueryBuilder('resource')
        .select('resource.subject', 'subject')
        .addSelect('resource.course_code', 'course_code')
        .addSelect('COUNT(resource.id)', 'resourceCount')
        .where('resource.status = :status', { status: ResourceStatus.APPROVED })
        .groupBy('resource.subject')
        .addGroupBy('resource.course_code')
        .orderBy('"resourceCount"', 'DESC')
        .addOrderBy('resource.subject', 'ASC')
        .offset(skip)
        .limit(take)
        .getRawMany();

      const totalResult = await this.resourceRepository
        .createQueryBuilder('resource')
        .select('resource.subject')
        .where('resource.status = :status', { status: ResourceStatus.APPROVED })
        .groupBy('resource.subject')
        .addGroupBy('resource.course_code')
        .getRawMany();

      return { data, total: totalResult.length, page, limit: take };
    });
  }

  async findTrending(): Promise<Resource[]> {
    return this.redisService.wrap(CACHE_KEYS.RESOURCES_TRENDING, 600, async () => {
      return await this.resourceRepository.find({
        where: { status: ResourceStatus.APPROVED },
        relations: ['uploader'],
        order: {
          downloads: 'DESC',
          avg_rating: 'DESC',
        },
        take: 10,
      });
    });
  }

  async findOne(id: number): Promise<Resource> {
    const resource = await this.resourceRepository.findOne({
      where: { id },
      relations: ['uploader'],
    });
    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }
    return resource;
  }

  async findOneCached(id: number): Promise<Resource> {
    return this.redisService.wrap(CACHE_KEYS.RESOURCES_ONE(id), 120, () => this.findOne(id));
  }

  async update(id: number, updateResourceDto: UpdateResourceDto, user: any): Promise<Resource> {
    const resource = await this.findOne(id);
    if (resource.uploader_id !== user.id && user.role !== 'admin' && user.role !== 'moderator') {
      throw new ForbiddenException('You do not have permission to edit this resource');
    }
    Object.assign(resource, updateResourceDto);
    const updated = await this.resourceRepository.save(resource);
    await this.redisService.delByPattern(CACHE_KEYS.RESOURCES_PATTERN);
    return updated;
  }

  async updateStatus(id: number, status: ResourceStatus, userRole?: string): Promise<Resource> {
    const resource = await this.findOne(id);
    resource.status = status;
    const saved = await this.resourceRepository.save(resource);
    await this.redisService.delByPattern(CACHE_KEYS.RESOURCES_PATTERN);
    return saved;
  }

  async incrementDownload(id: number): Promise<Resource> {
    const resource = await this.findOne(id);
    resource.downloads += 1;
    const saved = await this.resourceRepository.save(resource);
    await this.redisService.delByPattern(CACHE_KEYS.RESOURCES_PATTERN);
    return saved;
  }

  async remove(id: number, user: any): Promise<void> {
    const resource = await this.findOne(id);
    if (resource.uploader_id !== user.id && user.role !== 'admin' && user.role !== 'moderator') {
      throw new ForbiddenException('You do not have permission to delete this resource');
    }
    await this.resourceRepository.remove(resource);
    await this.redisService.delByPattern(CACHE_KEYS.RESOURCES_PATTERN);
  }
}
