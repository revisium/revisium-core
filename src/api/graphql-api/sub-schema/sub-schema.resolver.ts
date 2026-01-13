import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import { SubSchemaApiService } from 'src/features/sub-schema';
import { GetSubSchemaItemsInput } from './inputs/get-sub-schema-items.input';
import {
  SubSchemaItemModel,
  SubSchemaItemsConnection,
} from './model/sub-schema-item.model';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver(() => SubSchemaItemModel)
export class SubSchemaResolver {
  constructor(private readonly subSchemaApi: SubSchemaApiService) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => SubSchemaItemsConnection)
  subSchemaItems(@Args('data') data: GetSubSchemaItemsInput) {
    return this.subSchemaApi.getSubSchemaItems(data);
  }
}
