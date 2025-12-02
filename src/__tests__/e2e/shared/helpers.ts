import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

export async function makeProjectPublic(
  app: INestApplication,
  projectId: string,
): Promise<void> {
  const prismaService = app.get(PrismaService);
  await prismaService.project.update({
    where: { id: projectId },
    data: { isPublic: true },
  });
}

export function authGet(
  app: INestApplication,
  url: string,
  token: string,
): request.Test {
  return request(app.getHttpServer())
    .get(url)
    .set('Authorization', `Bearer ${token}`);
}

export function anonGet(app: INestApplication, url: string): request.Test {
  return request(app.getHttpServer()).get(url);
}

export function authPost(
  app: INestApplication,
  url: string,
  token: string,
  body?: object,
): request.Test {
  const req = request(app.getHttpServer())
    .post(url)
    .set('Authorization', `Bearer ${token}`);

  if (body) {
    req.send(body);
  }

  return req;
}

export function anonPost(
  app: INestApplication,
  url: string,
  body?: object,
): request.Test {
  const req = request(app.getHttpServer()).post(url);

  if (body) {
    req.send(body);
  }

  return req;
}

export function authPut(
  app: INestApplication,
  url: string,
  token: string,
  body?: object,
): request.Test {
  const req = request(app.getHttpServer())
    .put(url)
    .set('Authorization', `Bearer ${token}`);

  if (body) {
    req.send(body);
  }

  return req;
}

export function authDelete(
  app: INestApplication,
  url: string,
  token: string,
): request.Test {
  return request(app.getHttpServer())
    .delete(url)
    .set('Authorization', `Bearer ${token}`);
}

export function anonDelete(app: INestApplication, url: string): request.Test {
  return request(app.getHttpServer()).delete(url);
}

export interface PrivateProjectTestContext {
  app: INestApplication;
  ownerToken: string;
  anotherOwnerToken: string;
  getUrl: () => string;
}
