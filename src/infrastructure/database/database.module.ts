import { Module } from '@nestjs/common';
import { IdService } from 'src/infrastructure/database/id.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@Module({
  imports: [],
  providers: [PrismaService, IdService, TransactionPrismaService],
  exports: [PrismaService, IdService, TransactionPrismaService],
})
export class DatabaseModule {}
