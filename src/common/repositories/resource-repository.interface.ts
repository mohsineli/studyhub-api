import { Resource } from '../../resources/entities/resource.entity';

export interface IResourceRepository {
  create(data: Partial<Resource>): Resource;
  save(resource: Resource): Promise<Resource>;
  findOne(options: { where: any; relations?: string[] }): Promise<Resource | null>;
  find(options: { where: any; relations?: string[]; order?: any; take?: number }): Promise<Resource[]>;
  findAndCount(options: { where: any; relations?: string[]; order?: any; take?: number; skip?: number }): Promise<[Resource[], number]>;
  remove(resource: Resource): Promise<Resource>;
  count(options?: { where?: any }): Promise<number>;
  createQueryBuilder(alias: string): any;
}
