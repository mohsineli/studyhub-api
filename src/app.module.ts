import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().uri().optional(),
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
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
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
    AuthModule,
    UsersModule,
    MailModule,
    NotesModule,
    BookmarksModule,
    ReviewsModule,
    ResourcesModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
