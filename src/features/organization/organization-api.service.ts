import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  GetOrganizationQuery,
  GetOrganizationQueryData,
  GetOrganizationQueryReturnType,
} from 'src/features/organization/queries/impl';

@Injectable()
export class OrganizationApiService {
  constructor(private readonly queryBus: QueryBus) {}

  public organization(data: GetOrganizationQueryData) {
    return this.queryBus.execute<
      GetOrganizationQuery,
      GetOrganizationQueryReturnType
    >(new GetOrganizationQuery(data));
  }
}
