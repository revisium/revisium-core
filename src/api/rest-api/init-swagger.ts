import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as packageJson from 'package.json';

export function initSwagger(app: INestApplication<any>) {
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
    .addTag(
      'Configuration',
      'System configuration and feature flags',
    )
    .addTag(
      'Auth',
      'Authentication, user registration, and password management',
    )
    .addTag(
      'User',
      'Current user profile and preferences',
    )
    .addTag(
      'Organization',
      'Organization management, projects, and team members',
    )
    .addTag(
      'Project',
      'Project lifecycle, branches, and endpoint management',
    )
    .addTag(
      'Branch',
      'Branch operations, commits, reverts, and merges',
    )
    .addTag(
      'Revision',
      'Revision snapshots, tables, rows, and change history',
    )
    .addTag(
      'Table',
      'Table schema and row CRUD operations within a revision',
    )
    .addTag(
      'Row',
      'Individual row operations, data updates, and file uploads',
    )
    .addTag(
      'Endpoint',
      'API endpoint configuration for GraphQL and REST access',
    )
    .build();

  const document = SwaggerModule.createDocument(app, documentBuilder);
  SwaggerModule.setup('/api', app, document, {
    swaggerOptions: {
      urls: [{ name: 'OpenAPI JSON', url: '/api-json' }],
      persistAuthorization: true,
      tryItOutEnabled: true,
      filter: true,
      ignoreGlobalPrefix: true,
      docExpansion: 'none',
    },
  });
}
