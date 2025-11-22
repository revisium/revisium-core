import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RoleApiService } from 'src/features/role/role-api.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { ROLE_QUERIES } from 'src/features/role/queries';

@Module({
  imports: [CqrsModule, DatabaseModule],
  providers: [RoleApiService, ...ROLE_QUERIES],
  exports: [RoleApiService],
})
export class RoleModule {}
