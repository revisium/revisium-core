import { GetProjectsByOrganizationIdHandler } from 'src/organization/queries/handlers';
import { GetUsersOrganizationHandler } from 'src/organization/queries/handlers/get-users-organization.handler';

export const ORGANIZATIONS_QUERIES = [
  GetProjectsByOrganizationIdHandler,
  GetUsersOrganizationHandler,
];
