import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';
import { initSwagger } from 'src/api/rest-api/init-swagger';
import { AppModule } from 'src/app.module';
import { NoAuthService } from 'src/features/auth/no-auth.service';

const DEFAULT_BODY_LIMIT = '10mb';

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

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger({
      json: true,
      colors: true,
    }),
  });

  const config = app.get(ConfigService);
  const bodyLimit = config.get('BODY_LIMIT') ?? DEFAULT_BODY_LIMIT;

  const trustProxy = config.get<string>('TRUST_PROXY');
  if (trustProxy !== undefined && trustProxy !== '') {
    const value = parseTrustProxy(trustProxy);
    app.set('trust proxy', value);
    Logger.log(
      `Express 'trust proxy' set to ${JSON.stringify(value)}`,
      'Bootstrap',
    );
  }

  app.useBodyParser('json', { limit: bodyLimit });
  app.use(compression());
  app.use(cookieParser());

  app.use((_req: Request, res: Response, next: NextFunction) => {
    if (!_req.path.startsWith('/files/')) {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  });

  // Fail-closed CORS:
  // - CORS_ORIGIN set → explicit allowlist (preferred in prod)
  // - CORS_ORIGIN unset + non-production → reflect request Origin (dev convenience)
  // - CORS_ORIGIN unset + production → refuse cross-origin (same-origin only)
  //
  // `origin: true` with `credentials: true` would allow any origin to
  // make credentialed requests, which is a permissive default we do not
  // want production to fall into silently.
  const corsOrigin = config.get<string>('CORS_ORIGIN');
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const corsOriginSetting: boolean | string[] = corsOrigin
    ? corsOrigin.split(',').map((o) => o.trim())
    : !isProduction;
  if (corsOrigin === undefined && isProduction) {
    Logger.warn(
      'CORS_ORIGIN is not set in production — cross-origin requests will be refused. ' +
        'Set CORS_ORIGIN to an explicit allowlist if the admin UI is served from a different origin than core.',
      'Bootstrap',
    );
  }
  app.enableCors({
    maxAge: 86400,
    credentials: true,
    origin: corsOriginSetting,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  initSwagger(app);

  const noAuth = app.get(NoAuthService);
  if (noAuth.enabled) {
    Logger.warn(
      'Running in NO_AUTH mode — all requests are authorized as admin',
      'Bootstrap',
    );
  }

  const port = config.get('PORT') ?? 8080;

  app.enableShutdownHooks();
  await app.listen(port);
}

bootstrap();
