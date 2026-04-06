import { Module } from '@nestjs/common';
import { BranchApiService } from 'src/features/branch/branch-api.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [BranchApiService],
  exports: [BranchApiService],
})
export class BranchModule {}
