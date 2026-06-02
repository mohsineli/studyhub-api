import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotesService } from './notes.service';
import { Note, NoteStatus } from './entities/note.entity';
import { NoteReaction } from './entities/note-reaction.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { RedisService } from '../redis/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { NoteDownloadedEvent, NoteStatusChangedEvent } from '../common/events/index';

describe('NotesService', () => {
  let service: NotesService;
  let noteRepository: jest.Mocked<any>;
  let noteReactionRepository: jest.Mocked<any>;
  let userRepository: jest.Mocked<any>;
  let redisService: jest.Mocked<RedisService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockNote = {
    id: 1,
    title: 'Test Note',
    file_path: '/uploads/test.pdf',
    file_type: 'pdf',
    uploader_id: 1,
    status: NoteStatus.APPROVED,
    downloads: 0,
    avg_rating: 0,
    created_at: new Date(),
    uploader: { id: 1, name: 'Uploader' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        {
          provide: getRepositoryToken(Note),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(NoteReaction),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            increment: jest.fn(),
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
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
    noteRepository = module.get(getRepositoryToken(Note)) as jest.Mocked<any>;
    noteReactionRepository = module.get(getRepositoryToken(NoteReaction)) as jest.Mocked<any>;
    userRepository = module.get(getRepositoryToken(User)) as jest.Mocked<any>;
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
    notificationsService = module.get(NotificationsService) as jest.Mocked<NotificationsService>;
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      title: 'New Note',
      courseTitle: 'Math 101',
      code: 'MATH101',
      dept: 'Mathematics',
      file_path: '/uploads/new.pdf',
      file_type: 'pdf',
    };

    it('should create a note and invalidate cache', async () => {
      noteRepository.create.mockReturnValue(mockNote);
      noteRepository.save.mockResolvedValue(mockNote);
      redisService.delByPattern.mockResolvedValue(undefined as any);

      const result = await service.create(createDto, 1);

      expect(noteRepository.create).toHaveBeenCalledWith({
        ...createDto,
        uploader_id: 1,
      });
      expect(noteRepository.save).toHaveBeenCalled();
      expect(redisService.delByPattern).toHaveBeenCalledWith('notes:*');
      expect(result).toEqual(mockNote);
    });
  });

  describe('findAll', () => {
    it('should return paginated approved notes via cache', async () => {
      const mockData = [mockNote];
      redisService.wrap.mockImplementation(async (_key: string, _ttl: number, fn: () => any) => fn());
      noteRepository.findAndCount.mockResolvedValue([mockData, 1]);

      const result = await service.findAll('latest', 1, 12);

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(redisService.wrap).toHaveBeenCalled();
    });

    it('should apply top-rated sort', async () => {
      redisService.wrap.mockImplementation(async (_key: string, _ttl: number, fn: () => any) => fn());
      noteRepository.findAndCount.mockResolvedValue([[mockNote], 1]);

      await service.findAll('top-rated', 1, 12);

      const callArgs = noteRepository.findAndCount.mock.calls[0][0];
      expect(callArgs.order.avg_rating).toBe('DESC');
    });
  });

  describe('findOne', () => {
    it('should return a note by id', async () => {
      noteRepository.findOne.mockResolvedValue(mockNote);

      const result = await service.findOne(1);

      expect(result).toEqual(mockNote);
    });

    it('should throw NotFoundException if note not found', async () => {
      noteRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneCached', () => {
    it('should wrap findOne with cache', async () => {
      redisService.wrap.mockImplementation(async (_key: string, _ttl: number, fn: () => any) => fn());
      noteRepository.findOne.mockResolvedValue(mockNote);

      const result = await service.findOneCached(1);

      expect(redisService.wrap).toHaveBeenCalledWith('notes:1', 120, expect.any(Function));
      expect(result).toEqual(mockNote);
    });
  });

  describe('update', () => {
    const updateDto = { title: 'Updated Title' };

    it('should update note if owned by user', async () => {
      noteRepository.findOne.mockResolvedValue(mockNote);
      noteRepository.save.mockResolvedValue({ ...mockNote, ...updateDto });

      const result = await service.update(1, updateDto, { id: 1, role: UserRole.STUDENT });

      expect(result.title).toBe('Updated Title');
    });

    it('should allow admin to update any note', async () => {
      noteRepository.findOne.mockResolvedValue(mockNote);
      noteRepository.save.mockResolvedValue({ ...mockNote, ...updateDto });

      const result = await service.update(1, updateDto, { id: 999, role: UserRole.ADMIN });

      expect(result.title).toBe('Updated Title');
    });

    it('should throw ForbiddenException if not owner and not admin', async () => {
      noteRepository.findOne.mockResolvedValue(mockNote);

      await expect(
        service.update(1, updateDto, { id: 999, role: UserRole.STUDENT })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('incrementDownload', () => {
    it('should increment download count', async () => {
      noteRepository.findOne.mockResolvedValue(mockNote);
      noteRepository.save.mockResolvedValue({ ...mockNote, downloads: 1 });

      const result = await service.incrementDownload(1);

      expect(result.downloads).toBe(1);
    });

    it('should award points when downloader differs from uploader', async () => {
      noteRepository.findOne.mockResolvedValue(mockNote);
      noteRepository.save.mockResolvedValue({ ...mockNote, downloads: 1 });

      await service.incrementDownload(1, 2);

      expect(eventEmitter.emit).toHaveBeenCalledWith('note.downloaded', new NoteDownloadedEvent(1, 2, 1));
    });

    it('should not award points when downloader is uploader', async () => {
      noteRepository.findOne.mockResolvedValue(mockNote);
      noteRepository.save.mockResolvedValue({ ...mockNote, downloads: 1 });

      await service.incrementDownload(1, 1);

      expect(eventEmitter.emit).toHaveBeenCalledWith('note.downloaded', new NoteDownloadedEvent(1, 1, 1));
    });
  });

  describe('remove', () => {
    it('should remove note if owned by user', async () => {
      noteRepository.findOne.mockResolvedValue(mockNote);
      noteRepository.remove.mockResolvedValue(mockNote);

      await service.remove(1, { id: 1, role: UserRole.STUDENT });

      expect(noteRepository.remove).toHaveBeenCalledWith(mockNote);
    });

    it('should throw ForbiddenException if not owner', async () => {
      noteRepository.findOne.mockResolvedValue(mockNote);

      await expect(
        service.remove(1, { id: 999, role: UserRole.STUDENT })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    it('should approve note and reward uploader', async () => {
      noteRepository.findOne.mockResolvedValue(mockNote);
      noteRepository.save.mockResolvedValue({ ...mockNote, status: NoteStatus.APPROVED });

      const result = await service.updateStatus(1, NoteStatus.APPROVED);

      expect(result.status).toBe(NoteStatus.APPROVED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'note.status-changed',
        new NoteStatusChangedEvent(1, mockNote.title, mockNote.uploader_id, NoteStatus.APPROVED),
      );
    });

    it('should reject note and send notification', async () => {
      noteRepository.findOne.mockResolvedValue(mockNote);
      noteRepository.save.mockResolvedValue({ ...mockNote, status: NoteStatus.REJECTED });

      await service.updateStatus(1, NoteStatus.REJECTED);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'note.status-changed',
        new NoteStatusChangedEvent(1, mockNote.title, mockNote.uploader_id, NoteStatus.REJECTED),
      );
    });
  });

  describe('toggleReaction', () => {
    it('should create a new reaction', async () => {
      noteRepository.findOne.mockResolvedValue(mockNote);
      noteReactionRepository.findOne.mockResolvedValue(null);
      noteReactionRepository.save.mockResolvedValue({ note_id: 1, user_id: 1, reaction: 'like' });
      noteReactionRepository.find.mockResolvedValue([{ user_id: 1, reaction: 'like' }]);

      await service.toggleReaction(1, 1, 'like');

      expect(noteReactionRepository.save).toHaveBeenCalledWith({
        note_id: 1,
        user_id: 1,
        reaction: 'like',
      });
    });

    it('should remove reaction if same reaction clicked again', async () => {
      noteRepository.findOne.mockResolvedValue(mockNote);
      noteReactionRepository.findOne.mockResolvedValue({ note_id: 1, user_id: 1, reaction: 'like' });
      noteReactionRepository.remove.mockResolvedValue(undefined);
      noteReactionRepository.find.mockResolvedValue([]);

      await service.toggleReaction(1, 1, 'like');

      expect(noteReactionRepository.remove).toHaveBeenCalled();
    });

    it('should toggle reaction type if different', async () => {
      noteRepository.findOne.mockResolvedValue(mockNote);
      noteReactionRepository.findOne.mockResolvedValue({ note_id: 1, user_id: 1, reaction: 'like' });
      noteReactionRepository.save.mockResolvedValue({ note_id: 1, user_id: 1, reaction: 'dislike' });
      noteReactionRepository.find.mockResolvedValue([{ user_id: 1, reaction: 'dislike' }]);

      await service.toggleReaction(1, 1, 'dislike');

      expect(noteReactionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ reaction: 'dislike' })
      );
    });
  });
});
