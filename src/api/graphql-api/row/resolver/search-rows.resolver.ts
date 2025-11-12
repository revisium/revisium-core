import { UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { SearchRowsInput } from 'src/api/graphql-api/row/inputs/search-rows.input';
import { SearchResultsConnection } from 'src/api/graphql-api/row/model/search-results-connection.model';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import {
  SearchRowsQuery,
  SearchRowsResponse as ISearchRowsResponse,
} from 'src/features/row/queries/impl';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
@Resolver()
export class SearchRowsResolver {
  constructor(private readonly queryBus: QueryBus) {}

  @Query(() => SearchResultsConnection, { name: 'searchRows' })
  async searchRows(@Args('data') data: SearchRowsInput) {
    return this.queryBus.execute<SearchRowsQuery, ISearchRowsResponse>(
      new SearchRowsQuery({
        revisionId: data.revisionId,
        query: data.query,
        first: data.first,
        after: data.after,
      }),
    );
  }
}
