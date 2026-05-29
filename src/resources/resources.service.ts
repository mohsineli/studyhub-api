import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource, ResourceStatus } from './entities/resource.entity';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
    private readonly adminService: AdminService,
  ) {}

  async create(createResourceDto: CreateResourceDto, uploaderId: number): Promise<Resource> {
    // Check global setting 'resource_upload_visibility'
    const visibility = await this.adminService.getSetting('resource_upload_visibility', 'approved');
    const status = visibility === 'pending' ? ResourceStatus.PENDING : ResourceStatus.APPROVED;

    const resource = this.resourceRepository.create({
      ...createResourceDto,
      uploader_id: uploaderId,
      status,
    });
    return await this.resourceRepository.save(resource);
  }

  async findAll(page?: number, limit?: number) {
    const take = limit || 12;
    const skip = page ? (page - 1) * take : 0;

    const [data, total] = await this.resourceRepository.findAndCount({
      where: { status: ResourceStatus.APPROVED },
      relations: ['uploader'],
      order: { created_at: 'DESC' },
      take,
      skip,
    });

    return { data, total, page: page || 1, limit: take };
  }

  async findPending(page?: number, limit?: number) {
    const take = limit || 12;
    const skip = page ? (page - 1) * take : 0;

    const [data, total] = await this.resourceRepository.findAndCount({
      where: { status: ResourceStatus.PENDING },
      relations: ['uploader'],
      order: { created_at: 'DESC' },
      take,
      skip,
    });

    return { data, total, page: page || 1, limit: take };
  }

  async findTrending(): Promise<Resource[]> {
    return await this.resourceRepository.find({
      where: { status: ResourceStatus.APPROVED },
      relations: ['uploader'],
      order: {
        downloads: 'DESC',
        avg_rating: 'DESC',
      },
      take: 10,
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

  async update(id: number, updateResourceDto: UpdateResourceDto, user: any): Promise<Resource> {
    const resource = await this.findOne(id);
    if (resource.uploader_id !== user.id && user.role !== 'admin' && user.role !== 'moderator') {
      throw new ForbiddenException('You do not have permission to edit this resource');
    }
    Object.assign(resource, updateResourceDto);
    return await this.resourceRepository.save(resource);
  }

  async updateStatus(id: number, status: ResourceStatus, userRole?: string): Promise<Resource> {
    if (userRole && userRole !== 'admin') {
      await this.adminService.enforcePermission(userRole, 'perm_manage_resources');
    }
    const resource = await this.findOne(id);
    resource.status = status;
    return await this.resourceRepository.save(resource);
  }

  async incrementDownload(id: number): Promise<Resource> {
    const resource = await this.findOne(id);
    resource.downloads += 1;
    return await this.resourceRepository.save(resource);
  }

  async remove(id: number, user: any): Promise<void> {
    const resource = await this.findOne(id);
    if (resource.uploader_id !== user.id && user.role !== 'admin' && user.role !== 'moderator') {
      throw new ForbiddenException('You do not have permission to delete this resource');
    }
    await this.resourceRepository.remove(resource);
  }
}
