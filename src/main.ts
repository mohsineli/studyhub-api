import './instrument'; // Must be first so Sentry can instrument the app.
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

  // Security headers — allow frontend origins to frame the storage proxy for PDF/image previews
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    frameguard: false,
    contentSecurityPolicy: {
      directives: {
        frameAncestors: ["'self'", "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000", "http://127.0.0.1:8000", "https://studyhubbd.vercel.app", "http://localhost:8081"],
      },
    },
  }));

  // Enable cookie parsing — required for reading refresh_token cookie
  app.use(cookieParser());

  // Dynamic allowed origins for development and production
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://studyhubbd.vercel.app',
    'http://localhost:8081',
    'http://192.168.1.140:8081',
    'http://192.168.1.143:8081',
    'http://localhost:8000',
    'http://127.0.0.1:8000',

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

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
  console.log(`Application running on port ${process.env.PORT ?? 3001}`);
}
bootstrap();
