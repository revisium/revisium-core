import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { BranchApiService } from './branch-api.service';

@Module({
  imports: [DatabaseModule],
  providers: [BranchApiService],
  exports: [BranchApiService],
})
export class BranchModule {}
