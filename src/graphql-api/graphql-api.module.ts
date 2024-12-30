import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { GraphQLModule } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { join } from 'path';
import { AuthModule } from 'src/auth/auth.module';
import { AuthResolver } from 'src/graphql-api/auth/auth.resolver';
import { BranchResolver } from 'src/graphql-api/branch/branch.resolver';
import { ParentBranchResolver } from 'src/graphql-api/branch/parent-branch.resolver';
import { ConfigurationResolver } from 'src/graphql-api/configuration/configuration.resolver';
import { DraftResolver } from 'src/graphql-api/draft/draft.resolver';
import { EndpointResolver } from 'src/graphql-api/endpoint/endpoint.resolver';
import { OrganizationResolver } from 'src/graphql-api/organization/organization.resolver';
import { ProjectResolver } from 'src/graphql-api/project/project.resolver';
import { registerGraphqlEnums } from 'src/graphql-api/registerGraphqlEnums';
import { ChildBranchResolver } from 'src/graphql-api/revision/child-branch.resolver';
import { RevisionResolver } from 'src/graphql-api/revision/revision.resolver';
import { RowResolver } from 'src/graphql-api/row/row.resolver';
import { TableResolver } from 'src/graphql-api/table/table.resolver';
import { UserResolver } from 'src/graphql-api/user/user.resolver';
import { GraphqlMetricsPlugin } from 'src/metrics/graphql/graphql-metrics.plugin';
import { MetricsModule } from 'src/metrics/metrics.module';

@Module({
  imports: [
    MetricsModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      imports: [MetricsModule],
      driver: ApolloDriver,
      inject: [GraphqlMetricsPlugin],
      useFactory: (graphqlMetricsPlugin: GraphqlMetricsPlugin) => ({
        context: ({ res }: { res: any }) => ({ res }),
        path: '/-/graphql',
        resolvers: { JSON: GraphQLJSON },
        playground: false,
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        introspection: true,
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
