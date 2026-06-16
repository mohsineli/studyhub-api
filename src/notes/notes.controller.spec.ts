import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';

describe('NotesController', () => {
  let controller: NotesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotesController],
      providers: [
        {
          provide: NotesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            findOneCached: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            incrementDownload: jest.fn(),
            updateStatus: jest.fn(),
            toggleReaction: jest.fn(),
          },
        },
        {
          // NotesController injects @InjectQueue('moderation').
          provide: getQueueToken('moderation'),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<NotesController>(NotesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
