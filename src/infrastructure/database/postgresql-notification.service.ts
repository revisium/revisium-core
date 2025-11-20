import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/__generated__/client';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class PostgresqlNotificationService {
  constructor(private readonly prismaService: PrismaService) {}

  async notify(notification: string, payload: Prisma.JsonValue) {
    await this.prismaService.$executeRaw`
      SELECT pg_notify(
        ${notification},
        ${JSON.stringify(payload)}
      )
    `;
  }
}
