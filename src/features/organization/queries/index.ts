import { GetProjectsByOrganizationIdHandler } from 'src/features/organization/queries/handlers';
import { GetUsersOrganizationHandler } from 'src/features/organization/queries/handlers/get-users-organization.handler';
import { GetOrganizationHandler } from 'src/features/organization/queries/handlers/get-organization.handler';

export const ORGANIZATIONS_QUERIES = [
  GetProjectsByOrganizationIdHandler,
  GetUsersOrganizationHandler,
  GetOrganizationHandler,
];
