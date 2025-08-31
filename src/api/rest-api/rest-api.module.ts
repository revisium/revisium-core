import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from 'src/features/auth/auth.module';
import { DraftModule } from 'src/features/draft/draft.module';
import { EndpointModule } from 'src/features/endpoint/endpoint.module';
import { RevisionModule } from 'src/features/revision/revision.module';
import { RowModule } from 'src/features/row/row.module';
import { MetricsModule } from 'src/infrastructure/metrics/metrics.module';
import { AuthController } from 'src/api/rest-api/auth/auth.controller';
import { BranchByNameController } from 'src/api/rest-api/branch/branch-by-name.controller';
import { ConfigurationController } from 'src/api/rest-api/configuration/configuration.controller';
import { EndpointByIdController } from 'src/api/rest-api/endpoint/endpoint-by-id.controller';
import { ProjectController } from 'src/api/rest-api/project/project.controller';
import { OrganizationController } from 'src/api/rest-api/organization/organization.controller';
import { RevisionByIdController } from 'src/api/rest-api/revision/revision-by-id.controller';
import { RowByIdController } from 'src/api/rest-api/row/row-by-id.controller';
import { TableByIdController } from 'src/api/rest-api/table/table-by-id.controller';
import { UserController } from 'src/api/rest-api/user/user.controller';

@Module({
  imports: [
    CqrsModule,
    AuthModule,
    MetricsModule,
    EndpointModule,
    RevisionModule,
    DraftModule,
    RowModule,
  ],
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
