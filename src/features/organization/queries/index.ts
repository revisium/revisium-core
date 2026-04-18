import { GetProjectsByOrganizationIdHandler } from 'src/features/organization/queries/handlers/get-projects-by-organization-id.handler';
import { GetUsersOrganizationHandler } from 'src/features/organization/queries/handlers/get-users-organization.handler';
import { GetOrganizationHandler } from 'src/features/organization/queries/handlers/get-organization.handler';

export const ORGANIZATIONS_QUERIES = [
  GetProjectsByOrganizationIdHandler,
  GetUsersOrganizationHandler,
  GetOrganizationHandler,
];
