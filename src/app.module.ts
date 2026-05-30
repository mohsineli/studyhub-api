import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
            synchronize: true,
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
          synchronize: true,
          ssl: configService.get<string>('DATABASE_HOST') !== 'localhost' ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          maxRetriesPerRequest: null,
          retryStrategy: (times: number) => times > 5 ? null : Math.min(times * 200, 3000),
        },
      }),
    }),
    RedisModule,
    ThrottleConfigModule,
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
