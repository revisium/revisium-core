import {
  ConsoleLogger,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from 'src/app.module';
import * as packageJson from '../package.json';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      json: true,
      colors: true,
    }),
  });

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  initSwagger(app);

  const config = app.get(ConfigService);
  const port = config.get('PORT') ?? 8080;

  app.enableShutdownHooks();
  await app.listen(port);
}

function initSwagger(app: INestApplication<any>) {
  const documentBuilder = new DocumentBuilder()
    .setTitle('Revisium API')
    .setVersion(packageJson.version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, documentBuilder);
  SwaggerModule.setup('/api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
      filter: true,
      ignoreGlobalPrefix: true,
      docExpansion: 'none',
    },
  });
}

bootstrap();
