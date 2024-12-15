import { Module } from '@nestjs/common';
import { IdService } from 'src/database/id.service';
import { PrismaService } from 'src/database/prisma.service';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';

@Module({
  imports: [],
  providers: [PrismaService, IdService, TransactionPrismaService],
  exports: [PrismaService, IdService, TransactionPrismaService],
})
export class DatabaseModule {}
