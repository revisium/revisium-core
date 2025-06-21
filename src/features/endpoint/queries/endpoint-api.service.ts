import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  GetEndpointRelativesQuery,
  GetEndpointRelativesQueryData,
  GetEndpointRelativesQueryReturnType,
} from 'src/features/endpoint/queries/impl';

@Injectable()
export class EndpointApiService {
  constructor(private readonly queryBus: QueryBus) {}

  public getEndpointRelatives(data: GetEndpointRelativesQueryData) {
    return this.queryBus.execute<
      GetEndpointRelativesQuery,
      GetEndpointRelativesQueryReturnType
    >(new GetEndpointRelativesQuery(data));
  }
}
