import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'global',
            ttl: 60_000,
            limit: 100,
          },
          {
            name: 'auth',
            ttl: 60_000,
            limit: 5,
          },
        ],
      }),
    }),
  ],
})
export class ThrottleConfigModule {}
