import { DynamicModule, Module, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RouterModule } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppOptions } from 'src/app-mode';
import { AppOptionsModule } from 'src/core/app-options.module';

import { AuthModule } from 'src/features/auth/auth.module';
import { BillingModule } from 'src/features/billing/billing.module';
import { BranchModule } from 'src/features/branch/branch.module';
import { RevisiumCacheModule } from 'src/infrastructure/cache';
import { CleanModule } from 'src/infrastructure/clean/clean.module';
import { ConfigurationModule } from 'src/infrastructure/configuration/configuration.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { DraftModule } from 'src/features/draft/draft.module';
import { EmailModule } from 'src/infrastructure/email/email.module';
import { EndpointModule } from 'src/features/endpoint/endpoint.module';
import { GraphqlApiModule } from 'src/api/graphql-api/graphql-api.module';
import { HealthModule } from 'src/infrastructure/health/health.module';
import { McpModule } from 'src/api/mcp-api/mcp.module';
import { MetricsModule } from 'src/infrastructure/metrics/metrics.module';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { StorageModule } from 'src/infrastructure/storage/storage.module';
import { OrganizationModule } from 'src/features/organization/organization.module';
import { ProjectModule } from 'src/features/project/project.module';
import { RestApiModule } from 'src/api/rest-api/rest-api.module';
import { RevisionModule } from 'src/features/revision/revision.module';
import { RoleModule } from 'src/features/role/role.module';
import { RowModule } from 'src/features/row/row.module';
import { TableModule } from 'src/features/table/table.module';
import { UserModule } from 'src/features/user/user.module';

@Module({})
export class CoreModule {
  static forRoot(options: AppOptions): DynamicModule {
    const eeImports: (DynamicModule | Type)[] = [];

    if (process.env.REVISIUM_LICENSE_KEY) {
      const { EeLicensingModule } = require('ee/licensing/licensing.module');
      eeImports.push(EeLicensingModule);
    }
    if (process.env.REVISIUM_BILLING_ENABLED === 'true') {
      const { EeBillingModule } = require('ee/billing/ee-billing.module');
      eeImports.push(EeBillingModule.register());
    }

    return {
      module: CoreModule,
      imports: [
        AppOptionsModule.forRoot(options),
        AuthModule,
        BillingModule,
        ConfigModule.forRoot({
          ...(process.env.REVISIUM_STANDALONE ? { ignoreEnvFile: true } : {}),
        }),
        DatabaseModule,
        GraphqlApiModule,
        RestApiModule,
        RouterModule.register([
          {
            path: '/api',
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
        RoleModule,
        TableModule,
        RowModule,
        DraftModule,
        EndpointModule,
        MetricsModule,
        McpModule,
        StorageModule,
        RevisiumCacheModule.forRootAsync(),
        ...eeImports,
      ],
    };
  }
}
