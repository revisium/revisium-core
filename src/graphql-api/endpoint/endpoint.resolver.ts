import { UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  Args,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { PermissionAction, PermissionSubject } from 'src/auth/consts';
import { GqlJwtAuthGuard } from 'src/auth/guards/jwt/gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/auth/guards/project.guard';
import {
  ApiCreateEndpointCommand,
  DeleteEndpointCommand,
} from 'src/endpoint/commands/impl';
import { GetRevisionByEndpointIdQuery } from 'src/endpoint/queries/impl';
import {
  CreateEndpointInput,
  DeleteEndpointInput,
} from 'src/graphql-api/endpoint/inputs';
import { EndpointModel } from 'src/graphql-api/endpoint/model';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver(() => EndpointModel)
export class EndpointResolver {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
  ) {}

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
