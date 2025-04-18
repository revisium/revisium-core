import { Module } from '@nestjs/common';
import { HashService } from 'src/infrastructure/database/hash.service';
import { IdService } from 'src/infrastructure/database/id.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@Module({
  imports: [],
  providers: [PrismaService, IdService, TransactionPrismaService, HashService],
  exports: [PrismaService, IdService, TransactionPrismaService, HashService],
})
export class DatabaseModule {}
