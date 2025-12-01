import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiCreateEndpointCommand,
  ApiCreateEndpointCommandData,
  ApiCreateEndpointCommandReturnType,
  DeleteEndpointCommand,
  DeleteEndpointCommandData,
} from 'src/features/endpoint/commands/impl';
import {
  GetEndpointRelativesQuery,
  GetEndpointRelativesQueryData,
  GetEndpointRelativesQueryReturnType,
  GetProjectEndpointsData,
  GetProjectEndpointsQuery,
  GetProjectEndpointsReturnType,
  GetRevisionByEndpointIdQuery,
} from 'src/features/endpoint/queries/impl';

@Injectable()
export class EndpointApiService {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  public getEndpointRelatives(data: GetEndpointRelativesQueryData) {
    return this.queryBus.execute<
      GetEndpointRelativesQuery,
      GetEndpointRelativesQueryReturnType
    >(new GetEndpointRelativesQuery(data));
  }

  public getProjectEndpoints(data: GetProjectEndpointsData) {
    return this.queryBus.execute<
      GetProjectEndpointsQuery,
      GetProjectEndpointsReturnType
    >(new GetProjectEndpointsQuery(data));
  }

  public getRevisionByEndpointId(endpointId: string) {
    return this.queryBus.execute<GetRevisionByEndpointIdQuery, unknown>(
      new GetRevisionByEndpointIdQuery(endpointId),
    );
  }

  public apiCreateEndpoint(data: ApiCreateEndpointCommandData) {
    return this.commandBus.execute<
      ApiCreateEndpointCommand,
      ApiCreateEndpointCommandReturnType
    >(new ApiCreateEndpointCommand(data));
  }

  public deleteEndpoint(data: DeleteEndpointCommandData) {
    return this.commandBus.execute<DeleteEndpointCommand, boolean>(
      new DeleteEndpointCommand(data),
    );
  }
}
