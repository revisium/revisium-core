import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RouterModule } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from 'src/auth/auth.module';

import { BranchModule } from 'src/branch/branch.module';
import { CleanModule } from 'src/clean/clean.module';
import { ConfigurationModule } from 'src/configuration/configuration.module';
import { DatabaseModule } from 'src/database/database.module';
import { DraftModule } from 'src/draft/draft.module';
import { EmailModule } from 'src/email/email.module';
import { EndpointModule } from 'src/endpoint/endpoint.module';
import { GraphqlApiModule } from 'src/graphql-api/graphql-api.module';
import { HealthModule } from 'src/health/health.module';
import { MetricsModule } from 'src/metrics/metrics.module';
import { NotificationModule } from 'src/notification/notification.module';
import { OrganizationModule } from 'src/organization/organization.module';
import { ProjectModule } from 'src/project/project.module';
import { RestApiModule } from 'src/rest-api/rest-api.module';
import { RevisionModule } from 'src/revision/revision.module';
import { RowModule } from 'src/row/row.module';
import { TableModule } from 'src/table/table.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot(),
    DatabaseModule,
    GraphqlApiModule,
    RestApiModule,
    RouterModule.register([
      {
        path: '/-/api',
        module: RestApiModule,
      },
    ]),
    ScheduleModule.forRoot(),
    ConfigurationModule,
    CleanModule,
    NotificationModule,
    HealthModule,
    EmailModule,
    UserModule,
    OrganizationModule,
    ProjectModule,
    BranchModule,
    RevisionModule,
    TableModule,
    RowModule,
    DraftModule,
    EndpointModule,
    MetricsModule,
  ],
})
export class CoreModule {}
