import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

const dbUrl = configService.get<string>('DATABASE_URL');

const baseConfig = dbUrl
  ? {
      type: 'postgres' as const,
      url: dbUrl,
      ssl: { rejectUnauthorized: false },
    }
  : {
      type: 'postgres' as const,
      host: configService.get<string>('DATABASE_HOST'),
      port: configService.get<number>('DATABASE_PORT'),
      username: configService.get<string>('DATABASE_USERNAME'),
      password: configService.get<string>('DATABASE_PASSWORD'),
      database: configService.get<string>('DATABASE_NAME'),
      ssl:
        configService.get<string>('DATABASE_HOST') !== 'localhost'
          ? { rejectUnauthorized: false }
          : false,
    };

export default new DataSource({
  ...baseConfig,
  entities: [
    'src/**/*.entity.ts',
  ],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'migrations',
});
