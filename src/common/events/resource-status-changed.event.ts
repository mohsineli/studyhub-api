import { ResourceStatus } from '../../resources/entities/resource.entity';

export class ResourceStatusChangedEvent {
  constructor(
    public readonly resourceId: number,
    public readonly title: string,
    public readonly uploaderId: number,
    public readonly status: ResourceStatus,
    public readonly filePath?: string,
  ) {}
}
