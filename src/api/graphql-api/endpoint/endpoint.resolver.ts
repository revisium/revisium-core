import { UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import {
  CreateEndpointInput,
  DeleteEndpointInput,
  GetProjectEndpointsInput,
} from 'src/api/graphql-api/endpoint/inputs';
import {
  EndpointModel,
  EndpointsConnection,
} from 'src/api/graphql-api/endpoint/model';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import {
  ApiCreateEndpointCommand,
  DeleteEndpointCommand,
} from 'src/features/endpoint/commands/impl';
import {
  GetProjectEndpointsQuery,
  GetRevisionByEndpointIdQuery,
} from 'src/features/endpoint/queries/impl';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver(() => EndpointModel)
export class EndpointResolver {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => EndpointsConnection)
  projectEndpoints(@Args('data') data: GetProjectEndpointsInput) {
    return this.queryBus.execute(new GetProjectEndpointsQuery(data));
  }

  @ResolveField()
  revision(@Parent() endpoint: EndpointModel) {
    return this.queryBus.execute(new GetRevisionByEndpointIdQuery(endpoint.id));
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Endpoint,
  })
  @Mutation(() => EndpointModel)
  createEndpoint(@Args('data') data: CreateEndpointInput) {
    return this.commandBus.execute(new ApiCreateEndpointCommand(data));
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Endpoint,
  })
  @Mutation(() => Boolean)
  deleteEndpoint(@Args('data') data: DeleteEndpointInput) {
    return this.commandBus.execute<DeleteEndpointCommand, boolean>(
      new DeleteEndpointCommand(data),
    );
  }
}
