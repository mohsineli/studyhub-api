import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResourcesService } from './resources.service';
import { Resource, ResourceStatus } from './entities/resource.entity';
import { SettingsService } from '../admin/settings.service';
import { RedisService } from '../redis/redis.service';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let resourceRepository: jest.Mocked<any>;
  let settingsService: jest.Mocked<SettingsService>;
  let redisService: jest.Mocked<RedisService>;

  const mockResource = {
    id: 1,
    title: 'Test Resource',
    file_path: '/uploads/test.pdf',
    subject: 'Math',
    course_code: 'MATH101',
    uploader_id: 1,
    status: ResourceStatus.APPROVED,
    downloads: 0,
    avg_rating: 0,
    created_at: new Date(),
    uploader: { id: 1, name: 'Uploader' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        {
          provide: getRepositoryToken(Resource),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            createQueryBuilder: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: SettingsService,
          useValue: {
            getSetting: jest.fn().mockResolvedValue('approved'),
          },
        },
        {
          provide: RedisService,
          useValue: {
            wrap: jest.fn(),
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            delByPattern: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ResourcesService>(ResourcesService);
    resourceRepository = module.get(getRepositoryToken(Resource)) as jest.Mocked<any>;
    settingsService = module.get(SettingsService) as jest.Mocked<SettingsService>;
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      title: 'New Resource',
      file_path: '/uploads/new.pdf',
      subject: 'Physics',
      course_code: 'PHY101',
    };

    it('should create an approved resource when visibility setting is "approved"', async () => {
      settingsService.getSetting.mockResolvedValue('approved');
      resourceRepository.create.mockReturnValue(mockResource);
      resourceRepository.save.mockResolvedValue(mockResource);

      const result = await service.create(createDto, 1);

      expect(resourceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ResourceStatus.APPROVED })
      );
      expect(result).toEqual(mockResource);
    });

    it('should create a pending resource when visibility setting is "pending"', async () => {
      settingsService.getSetting.mockResolvedValue('pending');
      resourceRepository.create.mockImplementation((data: any) => data);
      resourceRepository.save.mockImplementation((data: any) => data);

      const result = await service.create(createDto, 1);

      expect(result.status).toBe(ResourceStatus.PENDING);
    });

    it('should invalidate resource cache on create', async () => {
      settingsService.getSetting.mockResolvedValue('approved');
      resourceRepository.create.mockReturnValue(mockResource);
      resourceRepository.save.mockResolvedValue(mockResource);

      await service.create(createDto, 1);

      expect(redisService.delByPattern).toHaveBeenCalledWith('resources:*');
    });
  });

  describe('findAll', () => {
    it('should return paginated approved resources', async () => {
      const mockData = [mockResource];
      redisService.wrap.mockImplementation(async (_key: string, _ttl: number, fn: () => any) => fn());
      resourceRepository.findAndCount.mockResolvedValue([mockData, 1]);

      const result = await service.findAll(1, 12);

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });

  describe('findCourses', () => {
    const mockCourseRow = {
      subject: 'Math',
      course_code: 'MATH101',
      resourceCount: '5',
    };

    function createQueryBuilderMock() {
      let query: any = {};
      const mockQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      };
      return mockQB;
    }

    it('should return paginated course groupings', async () => {
      redisService.wrap.mockImplementation(async (_key: string, _ttl: number, fn: () => any) => fn());

      const dataQb = createQueryBuilderMock();
      dataQb.getRawMany.mockResolvedValue([mockCourseRow]);

      const countQb = createQueryBuilderMock();
      countQb.getRawMany.mockResolvedValue([mockCourseRow]);

      resourceRepository.createQueryBuilder
        .mockReturnValueOnce(dataQb)  // first call: data query
        .mockReturnValueOnce(countQb); // second call: count query

      const result = await service.findCourses(1, 12);

      expect(result.data).toEqual([mockCourseRow]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should only include approved resources in course grouping', async () => {
      redisService.wrap.mockImplementation(async (_key: string, _ttl: number, fn: () => any) => fn());

      const dataQb = createQueryBuilderMock();
      dataQb.getRawMany.mockResolvedValue([mockCourseRow]);

      const countQb = createQueryBuilderMock();
      countQb.getRawMany.mockResolvedValue([mockCourseRow]);

      resourceRepository.createQueryBuilder
        .mockReturnValueOnce(dataQb)
        .mockReturnValueOnce(countQb);

      await service.findCourses(1, 12);

      const whereCall = dataQb.where.mock.calls[0];
      expect(whereCall[0]).toContain('resource.status = :status');
      expect(whereCall[1]).toEqual({ status: ResourceStatus.APPROVED });
    });
  });

  describe('findTrending', () => {
    it('should return top 10 trending resources via cache', async () => {
      redisService.wrap.mockImplementation(async (_key: string, _ttl: number, fn: () => any) => fn());
      resourceRepository.find.mockResolvedValue([mockResource]);

      const result = await service.findTrending();

      expect(redisService.wrap).toHaveBeenCalledWith('resources:trending', 600, expect.any(Function));
      expect(result).toEqual([mockResource]);
    });
  });

  describe('findOne', () => {
    it('should return a resource by id', async () => {
      resourceRepository.findOne.mockResolvedValue(mockResource);

      const result = await service.findOne(1);

      expect(result).toEqual(mockResource);
    });

    it('should throw NotFoundException if not found', async () => {
      resourceRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = { title: 'Updated Resource' };

    it('should update if owned by user', async () => {
      resourceRepository.findOne.mockResolvedValue(mockResource);
      resourceRepository.save.mockResolvedValue({ ...mockResource, ...updateDto });

      const result = await service.update(1, updateDto, { id: 1, role: 'student' });

      expect(result.title).toBe('Updated Resource');
    });

    it('should allow moderator to update any resource', async () => {
      resourceRepository.findOne.mockResolvedValue(mockResource);
      resourceRepository.save.mockResolvedValue({ ...mockResource, ...updateDto });

      const result = await service.update(1, updateDto, { id: 999, role: 'moderator' });

      expect(result.title).toBe('Updated Resource');
    });

    it('should throw ForbiddenException if not owner', async () => {
      resourceRepository.findOne.mockResolvedValue(mockResource);

      await expect(
        service.update(1, updateDto, { id: 999, role: 'student' })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should remove resource if owned by user', async () => {
      resourceRepository.findOne.mockResolvedValue(mockResource);
      resourceRepository.remove.mockResolvedValue(mockResource);

      await service.remove(1, { id: 1, role: 'student' });

      expect(resourceRepository.remove).toHaveBeenCalledWith(mockResource);
    });

    it('should allow admin to delete any resource', async () => {
      resourceRepository.findOne.mockResolvedValue(mockResource);
      resourceRepository.remove.mockResolvedValue(mockResource);

      await service.remove(1, { id: 999, role: 'admin' });

      expect(resourceRepository.remove).toHaveBeenCalledWith(mockResource);
    });

    it('should throw ForbiddenException if not owner', async () => {
      resourceRepository.findOne.mockResolvedValue(mockResource);

      await expect(
        service.remove(1, { id: 999, role: 'student' })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('incrementDownload', () => {
    it('should increment download count and invalidate cache', async () => {
      resourceRepository.findOne.mockResolvedValue(mockResource);
      resourceRepository.save.mockResolvedValue({ ...mockResource, downloads: 1 });

      const result = await service.incrementDownload(1);

      expect(result.downloads).toBe(1);
      expect(redisService.delByPattern).toHaveBeenCalledWith('resources:*');
    });
  });
});
