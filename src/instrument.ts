import * as dotenv from 'dotenv';
import * as Sentry from '@sentry/nestjs';

// This file runs before main.ts calls dotenv.config(), so load the .env here too
// (idempotent) — otherwise SENTRY_DSN from a local .env wouldn't be seen yet.
dotenv.config();

/**
 * Initialise Sentry before any other module is imported (see main.ts — this file
 * must be the first import). When `SENTRY_DSN` is unset the SDK starts in a
 * disabled state and sends nothing, so shipping this without a configured Sentry
 * project is safe; set the env var in production to turn it on.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  // Off by default; opt into performance tracing via env (e.g. 0.1 = 10%).
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
});
