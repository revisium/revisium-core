import { AdminUserHandler } from 'src/features/user/queries/handlers/admin-user.handler';
import { GetProjectsByUserIdHandler } from 'src/features/user/queries/handlers/get-projects-by-user-id.handler';
import { GetUserOrganizationHandler } from 'src/features/user/queries/handlers/get-user-organization.handler';
import { GetUserProjectHandler } from 'src/features/user/queries/handlers/get-user-project.handler';
import { GetUserHandler } from 'src/features/user/queries/handlers/get-user.handler';
import { SearchUsersHandler } from 'src/features/user/queries/handlers/search-users.handler';

export const USER_QUERIES = [
  GetUserHandler,
  GetUserProjectHandler,
  GetProjectsByUserIdHandler,
  SearchUsersHandler,
  GetUserOrganizationHandler,
  AdminUserHandler,
];
