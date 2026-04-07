import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import { initSwagger } from 'src/api/rest-api/init-swagger';
import { AppModule } from 'src/app.module';
import { NoAuthService } from 'src/features/auth/no-auth.service';

const DEFAULT_BODY_LIMIT = '10mb';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger({
      json: true,
      colors: true,
    }),
  });

  const config = app.get(ConfigService);
  const bodyLimit = config.get('BODY_LIMIT') ?? DEFAULT_BODY_LIMIT;

  app.useBodyParser('json', { limit: bodyLimit });
  app.use(compression());

  app.use((_req: Request, res: Response, next: NextFunction) => {
    if (!_req.path.startsWith('/files/')) {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  });
  app.enableCors({
    maxAge: 86400,
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
