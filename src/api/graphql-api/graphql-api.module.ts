import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { GraphQLModule } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { join } from 'path';
import { AuthModule } from 'src/features/auth/auth.module';
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
import { TableResolver } from 'src/api/graphql-api/table/table.resolver';
import { UserResolver } from 'src/api/graphql-api/user/user.resolver';
import { GraphqlMetricsPlugin } from 'src/infrastructure/metrics/graphql/graphql-metrics.plugin';
import { MetricsModule } from 'src/infrastructure/metrics/metrics.module';

@Module({
  imports: [
    MetricsModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      imports: [MetricsModule],
      driver: ApolloDriver,
      inject: [GraphqlMetricsPlugin],
      useFactory: (graphqlMetricsPlugin: GraphqlMetricsPlugin) => ({
        context: ({ res }: { res: any }) => ({ res }),
        path: '/graphql',
        resolvers: { JSON: GraphQLJSON },
        playground: false,
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        introspection: true,
        formatError: (error) => {
          if (error.extensions?.stacktrace) {
            error.extensions.stacktrace = [];
          }
          return error;
        },
        plugins: [
          ApolloServerPluginLandingPageLocalDefault(),
          graphqlMetricsPlugin,
        ],
      }),
    }),
    CqrsModule,
    AuthModule,
  ],
  providers: [
    ConfigurationResolver,
    AuthResolver,
    UserResolver,
    OrganizationResolver,
    ProjectResolver,
    BranchResolver,
    ParentBranchResolver,
    ChildBranchResolver,
    DraftResolver,
    EndpointResolver,
    RevisionResolver,
    RowResolver,
    TableResolver,
  ],
})
export class GraphqlApiModule {}

registerGraphqlEnums();
