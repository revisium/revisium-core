import { ConsoleLogger, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { initSwagger } from 'src/api/rest-api/init-swagger';
import { AppModule } from 'src/app.module';
import { configureHttpApp } from 'src/configure-http-app';
import { NoAuthService } from 'src/features/auth/no-auth.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger({
      json: true,
      colors: true,
    }),
  });

  const config = configureHttpApp(app, {
    useCompression: true,
    noStoreExceptPathPrefixes: ['/files/'],
  });

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
