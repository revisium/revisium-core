import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from 'src/auth/auth.module';
import { MetricsModule } from 'src/metrics/metrics.module';
import { AuthController } from 'src/rest-api/auth/auth.controller';
import { BranchByNameController } from 'src/rest-api/branch/branch-by-name.controller';
import { ConfigurationController } from 'src/rest-api/configuration/configuration.controller';
import { EndpointByIdController } from 'src/rest-api/endpoint/endpointByIdController';
import { ProjectController } from 'src/rest-api/project/project.controller';
import { OrganizationController } from 'src/rest-api/organization/organization.controller';
import { RevisionByIdController } from 'src/rest-api/revision/revision-by-id.controller';
import { RowByIdController } from 'src/rest-api/row/row-by-id.controller';
import { TableByIdController } from 'src/rest-api/table/table-by-id.controller';
import { UserController } from 'src/rest-api/user/user.controller';

@Module({
  imports: [CqrsModule, AuthModule, MetricsModule],
  controllers: [
    AuthController,
    UserController,
    OrganizationController,
    ProjectController,
    BranchByNameController,
    RevisionByIdController,
    TableByIdController,
    RowByIdController,
    EndpointByIdController,
    ConfigurationController,
  ],
})
export class RestApiModule {}
