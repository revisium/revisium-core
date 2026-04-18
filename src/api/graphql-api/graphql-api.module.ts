import { YogaDriver, YogaDriverConfig } from '@graphql-yoga/nestjs';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { GraphQLHttpExceptionFilter } from 'src/api/graphql-api/filters/graphql-http-exception.filter';
import { DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { BillingConfigurationResolver } from 'src/api/graphql-api/billing/billing-configuration.resolver';
import { BillingMutationResolver } from 'src/api/graphql-api/billing/billing-mutation.resolver';
import { BillingOrganizationResolver } from 'src/api/graphql-api/billing/billing-organization.resolver';
import { BillingQueryResolver } from 'src/api/graphql-api/billing/billing-query.resolver';
import { UsersOrganizationResolver } from 'src/api/graphql-api/organization/users-organization.resolver';
import { UsersProjectResolver } from 'src/api/graphql-api/project/users-project.resolver';
import { RevisionChangesResolver } from 'src/api/graphql-api/revision-changes/revision-changes.resolver';
import { RoleResolver } from 'src/api/graphql-api/role/role.resolver';
import { ViewsResolver } from 'src/api/graphql-api/views/views.resolver';
import { AuthModule } from 'src/features/auth/auth.module';
import { BranchModule } from 'src/features/branch/branch.module';
import { EndpointModule } from 'src/features/endpoint/endpoint.module';
import { AuthResolver } from 'src/api/graphql-api/auth/auth.resolver';
import { BranchResolver } from 'src/api/graphql-api/branch/branch.resolver';
import { ParentBranchResolver } from 'src/api/graphql-api/branch/parent-branch.resolver';
import { ConfigurationResolver } from 'src/api/graphql-api/configuration/configuration.resolver';
import { DraftResolver } from 'src/api/graphql-api/draft/draft.resolver';
import { EndpointResolver } from 'src/api/graphql-api/endpoint/endpoint.resolver';
import { OrganizationResolver } from 'src/api/graphql-api/organization/organization.resolver';
import { ProjectResolver } from 'src/api/graphql-api/project/project.resolver';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import { ChildBranchResolver } from 'src/api/graphql-api/revision/child-branch.resolver';
import { RevisionResolver } from 'src/api/graphql-api/revision/revision.resolver';
import { RowResolver } from 'src/api/graphql-api/row/row.resolver';
import { SearchRowsResolver } from 'src/api/graphql-api/row/resolver/search-rows.resolver';
import { TableResolver } from 'src/api/graphql-api/table/table.resolver';
import { MeResolver } from 'src/api/graphql-api/user/me.resolver';
import { UserResolver } from 'src/api/graphql-api/user/user.resolver';
import { RevisionModule } from 'src/features/revision';
import { RoleModule } from 'src/features/role/role.module';
import { RowModule } from 'src/features/row/row.module';
import { UserModule } from 'src/features/user/user.module';
import { OrganizationModule } from 'src/features/organization/organization.module';
import { ProjectModule } from 'src/features/project/project.module';
import { TableModule } from 'src/features/table/table.module';
import { ViewsModule } from 'src/features/views/views.module';
import { ConfigurationModule } from 'src/infrastructure/configuration/configuration.module';
import { GraphqlMetricsPlugin } from 'src/infrastructure/metrics/graphql/graphql-metrics.plugin';
import { MetricsModule } from 'src/infrastructure/metrics/metrics.module';
import { RevisionChangesModule } from 'src/features/revision-changes/revision-changes.module';
import { ApiKeyModule } from 'src/features/api-key/api-key.module';
import { SubSchemaModule } from 'src/features/sub-schema';
import { ApiKeyResolver } from 'src/api/graphql-api/api-key/api-key.resolver';
import { CacheResolver } from 'src/api/graphql-api/cache/cache.resolver';
import { SubSchemaResolver } from 'src/api/graphql-api/sub-schema/sub-schema.resolver';

@Module({
  imports: [
    MetricsModule,
    GraphQLModule.forRootAsync<YogaDriverConfig>({
      imports: [MetricsModule],
      driver: YogaDriver,
      inject: [GraphqlMetricsPlugin],
      useFactory: (graphqlMetricsPlugin: GraphqlMetricsPlugin) => ({
        path: '/graphql',
        autoSchemaFile: true,
        sortSchema: true,
        introspection: true,
        resolvers: { DateTime: DateTimeResolver, JSON: JSONResolver },
        maskedErrors: false,
        plugins: [graphqlMetricsPlugin.createPlugin()],
      }),
    }),
    AuthModule,
    BranchModule,
    ConfigurationModule,
    EndpointModule,
    UserModule,
    OrganizationModule,
    ProjectModule,
    RoleModule,
    RowModule,
    RevisionModule,
    RevisionChangesModule,
    TableModule,
    ViewsModule,
    SubSchemaModule,
    ApiKeyModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GraphQLHttpExceptionFilter },
    BillingConfigurationResolver,
    BillingOrganizationResolver,
    BillingQueryResolver,
    BillingMutationResolver,
    ConfigurationResolver,
    AuthResolver,
    MeResolver,
    UserResolver,
    OrganizationResolver,
    UsersOrganizationResolver,
    ProjectResolver,
    UsersProjectResolver,
    RoleResolver,
    BranchResolver,
    ParentBranchResolver,
    ChildBranchResolver,
    DraftResolver,
    EndpointResolver,
    RevisionResolver,
    RowResolver,
    SearchRowsResolver,
    TableResolver,
    RevisionChangesResolver,
    ViewsResolver,
    SubSchemaResolver,
    ApiKeyResolver,
    CacheResolver,
  ],
})
export class GraphqlApiModule {}

registerGraphqlEnums();
