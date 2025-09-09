import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HashService } from 'src/infrastructure/database/hash.service';
import { IdService } from 'src/infrastructure/database/id.service';
import { PostgresqlNotificationService } from 'src/infrastructure/database/postgresql-notification.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { S3Service } from 'src/infrastructure/database/s3.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    PostgresqlNotificationService,
    IdService,
    TransactionPrismaService,
    HashService,
    S3Service,
  ],
  exports: [
    PrismaService,
    PostgresqlNotificationService,
    IdService,
    TransactionPrismaService,
    HashService,
    S3Service,
  ],
})
export class DatabaseModule {}
