import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { NotesModule } from './notes/notes.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ResourcesModule } from './resources/resources.module';
import { AdminModule } from './admin/admin.module';
import { RedisModule } from './redis/redis.module';
import { ThrottleConfigModule } from './redis/throttle-config.module';
import { QueueModule } from './queue/queue.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RepositoriesModule } from './common/repositories/repositories.module';
import { NoteEventsListener } from './common/events/note-events.listener';
import { StorageModule } from './storage/storage.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_TYPE: Joi.string().valid('postgres', 'sqlite').default('postgres'),
        DATABASE_URL: Joi.string().uri().optional(),
        DATABASE: Joi.string().optional(),
        DATABASE_HOST: Joi.string().hostname().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
        DATABASE_PORT: Joi.number().port().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
        DATABASE_USERNAME: Joi.string().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
        DATABASE_PASSWORD: Joi.string().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
        DATABASE_NAME: Joi.string().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
        JWT_ACCESS_SECRET: Joi.string().min(16).required(),
        JWT_REFRESH_SECRET: Joi.string().min(16).required(),
        FRONTEND_URL: Joi.string().uri().required(),
        REDIS_URL: Joi.string().uri().optional(),
        REDIS_HOST: Joi.string().hostname().when('REDIS_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
        REDIS_PORT: Joi.number().port().when('REDIS_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
        MAIL_HOST: Joi.string().hostname().optional(),
        MAIL_PORT: Joi.number().port().optional(),
        MAIL_USER: Joi.string().optional(),
        MAIL_CLIENT_ID: Joi.string().optional(),
        MAIL_CLIENT_SECRET: Joi.string().optional(),
        MAIL_REFRESH_TOKEN: Joi.string().optional(),
        SESSION_DURATION_DAYS: Joi.number().min(1).max(365).default(7),
        OTP_EXPIRATION_MINUTES: Joi.number().min(1).max(60).default(10),
        ACTIVE_USER_WINDOW_MINUTES: Joi.number().min(1).max(1440).default(5),
        THROTTLE_TTL: Joi.number().min(1000).max(3600000).default(60000),
        THROTTLE_LIMIT: Joi.number().min(1).max(10000).default(100),
        BCRYPT_SALT_ROUNDS: Joi.number().min(4).max(16).default(10),
        R2_ACCESS_KEY_ID: Joi.string().optional(),
        R2_SECRET_ACCESS_KEY: Joi.string().optional(),
        R2_ENDPOINT: Joi.string().uri().optional(),
        R2_BUCKET: Joi.string().optional(),
        R2_PUBLIC_URL: Joi.string().uri().optional(),
        R2_PROXY_URL: Joi.string().optional(),
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isTest = process.env.NODE_ENV === 'test';
        const dbType = isTest ? 'sqlite' : configService.get<string>('DATABASE_TYPE', 'postgres');

        if (dbType === 'sqlite') {
          return {
            type: 'better-sqlite3',
            database: configService.get<string>('DATABASE', ':memory:'),
            autoLoadEntities: true,
            synchronize: true,
          };
        }

        const dbUrl = configService.get<string>('DATABASE_URL');
        
        if (dbUrl) {
          return {
            type: 'postgres',
            url: dbUrl,
            autoLoadEntities: true,
            synchronize: false,
            ssl: { rejectUnauthorized: false },
          };
        }

        return {
          type: 'postgres',
          host: configService.get<string>('DATABASE_HOST'),
          port: configService.get<number>('DATABASE_PORT'),
          username: configService.get<string>('DATABASE_USERNAME'),
          password: configService.get<string>('DATABASE_PASSWORD'),
          database: configService.get<string>('DATABASE_NAME'),
          autoLoadEntities: true,
            synchronize: false,
            ssl: configService.get<string>('DATABASE_HOST') !== 'localhost' ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    RedisModule,
    ThrottleConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          return { connection: { url: redisUrl } };
        }
        return {
          connection: {
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
          },
        };
      },
    }),
    QueueModule,
    NotificationsModule,
    RepositoriesModule,
    AuthModule,
    UsersModule,
    MailModule,
    NotesModule,
    BookmarksModule,
    ReviewsModule,
    ResourcesModule,
    AdminModule,
    StorageModule,
    WebsocketModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
