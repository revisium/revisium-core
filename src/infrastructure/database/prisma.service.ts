import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      // log: ['query'],
    });
  }

  async onModuleInit() {
    await this.$connect();

    console.log('test1');
    const res1 = await this.row.findMany({
      where: { id: '1' },
      select: {
        createdId: true,
        versionId: true,
      },
    });
    console.log('test2');
    const res2 = await this.row.findMany({
      where: {
        tables: {
          some: {
            createdId: 'tableId',
            revisions: {
              some: {
                id: 'rev1',
              },
            },
          },
        },
      },
      select: {
        createdId: true,
        versionId: true,
      },
    });
    console.log('test3');
  }
}
