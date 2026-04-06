import { Module } from '@nestjs/common';
import { BranchApiService } from './branch-api.service';

@Module({
  providers: [BranchApiService],
  exports: [BranchApiService],
})
export class BranchModule {}
