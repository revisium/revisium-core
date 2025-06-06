import { registerEnumType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import { OrderByField } from 'src/api/graphql-api/row/inputs';
import {
  UserOrganizationRoles,
  UserProjectRoles,
  UserSystemRoles,
} from 'src/features/auth/consts';
import { EndpointType } from 'src/api/graphql-api/endpoint/model';

export const registerGraphqlEnums = () => {
  registerEnumType(OrderByField, { name: 'OrderByField' });
  registerEnumType(Prisma.SortOrder, { name: 'SortOrder' });
  registerEnumType(Prisma.QueryMode, { name: 'QueryMode' });
  registerEnumType(UserSystemRoles, { name: 'UserSystemRole' });
  registerEnumType(UserOrganizationRoles, { name: 'UserOrganizationRoles' });
  registerEnumType(UserProjectRoles, { name: 'UserProjectRoles' });
  registerEnumType(EndpointType, { name: 'EndpointType' });
};
