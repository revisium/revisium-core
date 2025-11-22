import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrganizationApiService } from 'src/features/organization/organization-api.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { ORGANIZATIONS_COMMANDS } from 'src/features/organization/commands';
import { ORGANIZATIONS_QUERIES } from 'src/features/organization/queries';

@Module({
  imports: [CqrsModule, DatabaseModule],
  providers: [
    OrganizationApiService,
    ...ORGANIZATIONS_COMMANDS,
    ...ORGANIZATIONS_QUERIES,
  ],
  exports: [OrganizationApiService],
})
export class OrganizationModule {}
