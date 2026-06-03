import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from '../../resources/entities/resource.entity';
import { IResourceRepository } from './resource-repository.interface';

@Injectable()
export class ResourceRepository implements IResourceRepository {
  constructor(
    @InjectRepository(Resource) private readonly repo: Repository<Resource>,
  ) {}

  create(data: Partial<Resource>): Resource {
    return this.repo.create(data);
  }

  async save(resource: Resource): Promise<Resource> {
    return this.repo.save(resource);
  }

  async findOne(options: { where: any; relations?: string[] }): Promise<Resource | null> {
    return this.repo.findOne(options as any);
  }

  async find(options: { where: any; relations?: string[]; order?: any; take?: number }): Promise<Resource[]> {
    return this.repo.find(options as any);
  }

  async findAndCount(options: { where: any; relations?: string[]; order?: any; take?: number; skip?: number }): Promise<[Resource[], number]> {
    return this.repo.findAndCount(options as any);
  }

  async remove(resource: Resource): Promise<Resource> {
    return this.repo.remove(resource);
  }

  async count(options?: { where?: any }): Promise<number> {
    return this.repo.count(options ?? {});
  }

  createQueryBuilder(alias: string) {
    return this.repo.createQueryBuilder(alias);
  }
}
