import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { ORGANIZATIONS_COMMANDS } from 'src/features/organization/commands';
import { ORGANIZATIONS_QUERIES } from 'src/features/organization/queries';

@Module({
  imports: [CqrsModule, DatabaseModule],
  providers: [...ORGANIZATIONS_COMMANDS, ...ORGANIZATIONS_QUERIES],
})
export class OrganizationModule {}
