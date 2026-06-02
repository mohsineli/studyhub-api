import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as dns from 'dns';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

dotenv.config();
dns.setDefaultResultOrder('ipv4first'); // Force IPv4 to prevent ENETUNREACH on Render

// Suppress benign pg deprecation warning from TypeORM internals
const { emitWarning } = process;
process.emitWarning = function (warning, ...args) {
  const msg = typeof warning === 'string' ? warning : warning?.message || '';
  if (msg.includes('client.query() when the client is already executing a query')) return;
  return emitWarning.call(process, warning, ...args);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Enable cookie parsing — required for reading refresh_token cookie
  app.use(cookieParser());

  // Dynamic allowed origins for development and production
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://studyhubbd.vercel.app'
  ];

  // Enable CORS with credentials so the frontend can send/receive cookies
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Required for HttpOnly cookies
  });

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Application running on port ${process.env.PORT ?? 3001}`);
}
bootstrap();
