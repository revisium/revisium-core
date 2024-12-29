import { registerEnumType } from '@nestjs/graphql';
import {
  UserOrganizationRoles,
  UserProjectRoles,
  UserSystemRoles,
} from 'src/auth/consts';
import { EndpointType } from 'src/graphql-api/endpoint/model';

export const registerGraphqlEnums = () => {
  registerEnumType(UserSystemRoles, { name: 'UserSystemRole' });
  registerEnumType(UserOrganizationRoles, { name: 'UserOrganizationRoles' });
  registerEnumType(UserProjectRoles, { name: 'UserProjectRoles' });
  registerEnumType(EndpointType, { name: 'EndpointType' });
};