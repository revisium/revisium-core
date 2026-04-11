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

  const corsOrigin = config.get<string>('CORS_ORIGIN');
  app.enableCors({
    maxAge: 86400,
    credentials: true,
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true,
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
