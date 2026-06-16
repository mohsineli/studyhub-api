/**
 * Smoke suite for the critical flows: auth, upload, and moderation.
 *
 * These are HTTP-level checks — they boot each controller with a real Nest HTTP
 * server (via supertest), mock the service layer, and override auth guards, so
 * they verify routing/guard/response wiring without any database, Redis, or
 * queue. Service-level logic is covered separately by the *.service.spec files.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, type ExecutionContext } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import request from 'supertest';

import { getDataSourceToken } from '@nestjs/typeorm';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { HealthController } from './health/health.controller';
import { NotesController } from './notes/notes.controller';
import { NotesService } from './notes/notes.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { NoteStatus } from './notes/entities/note.entity';

// Stand-in guard: always allows and injects an authenticated admin user.
const allowGuard = {
  canActivate: (ctx: ExecutionContext) => {
    ctx.switchToHttp().getRequest().user = { id: 1, role: 'admin' };
    return true;
  },
};

describe('Smoke: critical flows', () => {
  describe('Health', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef: TestingModule = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [{ provide: getDataSourceToken(), useValue: { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } }],
      }).compile();
      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => app.close());

    it('GET /health reports ok when the DB responds', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database).toBe('up');
    });
  });

  describe('Auth — login', () => {
    let app: INestApplication;
    const authService = {
      login: jest.fn().mockResolvedValue({ access_token: 'a', refresh_token: 'r', user: { id: 1 } }),
    };

    beforeAll(async () => {
      const moduleRef: TestingModule = await Test.createTestingModule({
        controllers: [AuthController],
        providers: [{ provide: AuthService, useValue: authService }],
      }).compile();
      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => app.close());

    it('POST /auth/login returns tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'secret' })
        .expect(200);

      expect(res.body.access_token).toBe('a');
      expect(authService.login).toHaveBeenCalled();
    });
  });

  describe('Notes — upload & moderation', () => {
    let app: INestApplication;
    const notesService = {
      create: jest.fn().mockResolvedValue({ id: 1, title: 'Lecture 1' }),
      findOne: jest.fn().mockResolvedValue({ id: 1, title: 'Lecture 1', uploader_id: 2 }),
    };
    const moderationQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };

    beforeAll(async () => {
      const moduleRef: TestingModule = await Test.createTestingModule({
        controllers: [NotesController],
        providers: [
          { provide: NotesService, useValue: notesService },
          { provide: getQueueToken('moderation'), useValue: moderationQueue },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue(allowGuard)
        .overrideGuard(RolesGuard)
        .useValue(allowGuard)
        .compile();
      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => app.close());

    it('POST /notes (upload) delegates to the service', async () => {
      await request(app.getHttpServer())
        .post('/notes')
        .send({ title: 'Lecture 1', courseTitle: 'CS101', code: 'CS101', dept: 'CS', file_path: '/x.pdf', file_type: 'pdf' })
        .expect(201);

      expect(notesService.create).toHaveBeenCalled();
    });

    it('PATCH /notes/:id/status (moderation) queues a moderation job', async () => {
      const res = await request(app.getHttpServer())
        .patch('/notes/1/status')
        .send({ status: NoteStatus.APPROVED })
        .expect(200);

      expect(res.body.queued).toBe(true);
      expect(moderationQueue.add).toHaveBeenCalledWith(
        'update-status',
        expect.objectContaining({ itemId: 1, newStatus: NoteStatus.APPROVED }),
        expect.anything(),
      );
    });
  });
});
