import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';

const DEFAULT_BODY_LIMIT = '10mb';
const CORS_MAX_AGE_SECONDS = 86400;

export interface ConfigureHttpAppOptions {
  useCompression?: boolean;
  noStoreExceptPathPrefixes?: string[];
}

function parseTrustProxy(value: string): boolean | number | string {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  if (/^\d+$/.test(value)) {
    return Number(value);
  }
  return value;
}

function configureTrustProxy(
  app: NestExpressApplication,
  config: ConfigService,
) {
  const trustProxy = config.get<string>('TRUST_PROXY');
  if (trustProxy !== undefined && trustProxy !== '') {
    const value = parseTrustProxy(trustProxy);
    app.set('trust proxy', value);
    Logger.log(
      `Express 'trust proxy' set to ${JSON.stringify(value)}`,
      'Bootstrap',
    );
  }
}

function configureNoStoreHeaders(
  app: NestExpressApplication,
  exceptPathPrefixes: string[] | undefined,
) {
  if (exceptPathPrefixes === undefined) {
    return;
  }

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!exceptPathPrefixes.some((prefix) => req.path.startsWith(prefix))) {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  });
}

function getCorsOriginSetting(config: ConfigService): boolean | string[] {
  const corsOrigins = config
    .get<string>('CORS_ORIGIN')
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  if (!corsOrigins || corsOrigins.length === 0) {
    if (isProduction) {
      Logger.warn(
        'CORS_ORIGIN is not set in production - cross-origin requests will be refused. ' +
          'Set CORS_ORIGIN to an explicit allowlist if the admin UI is served from a different origin than core.',
        'Bootstrap',
      );
    }
    return !isProduction;
  }

  return corsOrigins;
}

export function configureHttpApp(
  app: NestExpressApplication,
  options: ConfigureHttpAppOptions = {},
): ConfigService {
  const config = app.get(ConfigService);
  const bodyLimit = config.get<string>('BODY_LIMIT') ?? DEFAULT_BODY_LIMIT;

  configureTrustProxy(app, config);

  app.useBodyParser('json', { limit: bodyLimit });
  if (options.useCompression) {
    app.use(compression());
  }
  app.use(cookieParser());
  configureNoStoreHeaders(app, options.noStoreExceptPathPrefixes);
  app.enableCors({
    maxAge: CORS_MAX_AGE_SECONDS,
    credentials: true,
    origin: getCorsOriginSetting(config),
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  return config;
}
