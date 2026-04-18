import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { CreateEndpointInput } from 'src/api/graphql-api/endpoint/inputs/create-endpoint.input';
import { DeleteEndpointInput } from 'src/api/graphql-api/endpoint/inputs/delete-endpoint.input';
import { GetProjectEndpointsInput } from 'src/api/graphql-api/endpoint/inputs/get-project-endpoints.input';
import { EndpointsConnection } from 'src/api/graphql-api/endpoint/model/endpoints-connection.model';
import { EndpointModel } from 'src/api/graphql-api/endpoint/model/endpoint.model';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import { EndpointApiService } from 'src/features/endpoint/queries/endpoint-api.service';

@PermissionParams({
  action: PermissionAction.read,
  subject: PermissionSubject.Project,
})
@Resolver(() => EndpointModel)
export class EndpointResolver {
  constructor(private readonly endpointApiService: EndpointApiService) {}

  @UseGuards(OptionalGqlJwtAuthGuard, GQLProjectGuard)
  @Query(() => EndpointsConnection)
  projectEndpoints(@Args('data') data: GetProjectEndpointsInput) {
    return this.endpointApiService.getProjectEndpoints(data);
  }

  @ResolveField()
  revision(@Parent() endpoint: EndpointModel) {
    return this.endpointApiService.getRevisionByEndpointId(endpoint.id);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.create,
    subject: PermissionSubject.Endpoint,
  })
  @Mutation(() => EndpointModel)
  createEndpoint(@Args('data') data: CreateEndpointInput) {
    return this.endpointApiService.apiCreateEndpoint(data);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.delete,
    subject: PermissionSubject.Endpoint,
  })
  @Mutation(() => Boolean)
  deleteEndpoint(@Args('data') data: DeleteEndpointInput) {
    return this.endpointApiService.deleteEndpoint(data);
  }
}
