import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from 'src/database/database.module';
import { ORGANIZATIONS_COMMANDS } from 'src/organization/commands';
import { ORGANIZATIONS_QUERIES } from 'src/organization/queries';

@Module({
  imports: [CqrsModule, DatabaseModule],
  providers: [...ORGANIZATIONS_COMMANDS, ...ORGANIZATIONS_QUERIES],
})
export class OrganizationModule {}
