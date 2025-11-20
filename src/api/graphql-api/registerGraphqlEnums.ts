import { registerEnumType } from '@nestjs/graphql';
import { Prisma } from 'src/__generated__/client';
import { PatchRowOp } from 'src/api/graphql-api/draft/input/patch-row.input';
import {
  OrderByField,
  OrderDataAggregation,
  OrderDataType,
  SearchIn,
  SearchType,
} from 'src/api/graphql-api/row/inputs';
import {
  UserOrganizationRoles,
  UserProjectRoles,
  UserSystemRoles,
} from 'src/features/auth/consts';
import { EndpointType } from 'src/api/graphql-api/endpoint/model';

export const registerGraphqlEnums = () => {
  registerEnumType(OrderByField, { name: 'OrderByField' });
  registerEnumType(OrderDataType, { name: 'OrderDataType' });
  registerEnumType(OrderDataAggregation, { name: 'OrderDataAggregation' });
  registerEnumType(SearchType, { name: 'SearchType' });
  registerEnumType(SearchIn, { name: 'SearchIn' });
  registerEnumType(Prisma.SortOrder, { name: 'SortOrder' });
  registerEnumType(Prisma.QueryMode, { name: 'QueryMode' });
  registerEnumType(PatchRowOp, { name: 'PatchRowOp' });
  registerEnumType(UserSystemRoles, { name: 'UserSystemRole' });
  registerEnumType(UserOrganizationRoles, { name: 'UserOrganizationRoles' });
  registerEnumType(UserProjectRoles, { name: 'UserProjectRoles' });
  registerEnumType(EndpointType, { name: 'EndpointType' });
};
