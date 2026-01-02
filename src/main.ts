import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import bodyParser from 'body-parser';
import { initSwagger } from 'src/api/rest-api/init-swagger';
import { AppModule } from 'src/app.module';

const DEFAULT_BODY_LIMIT = '10mb';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      json: true,
      colors: true,
    }),
  });

  const config = app.get(ConfigService);
  const bodyLimit = config.get('BODY_LIMIT') ?? DEFAULT_BODY_LIMIT;

  app.use(bodyParser.json({ limit: bodyLimit }));
  app.use(bodyParser.urlencoded({ limit: bodyLimit, extended: true }));
  app.use(compression());
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  initSwagger(app);

  const port = config.get('PORT') ?? 8080;

  app.enableShutdownHooks();
  await app.listen(port);
}

bootstrap();
