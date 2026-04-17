import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HashService } from '@revisium/engine';
import { IdService } from '@revisium/engine';
import { PostgresqlNotificationService } from 'src/infrastructure/database/postgresql-notification.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    PostgresqlNotificationService,
    IdService,
    TransactionPrismaService,
    HashService,
  ],
  exports: [
    PrismaService,
    PostgresqlNotificationService,
    IdService,
    TransactionPrismaService,
    HashService,
  ],
})
export class DatabaseModule {}
