import {
  GetProjectsByUserIdHandler,
  GetUserHandler,
  GetUserProjectHandler,
  SearchUsersHandler,
  GetUserOrganizationHandler,
} from 'src/features/user/queries/handlers';

export const USER_QUERIES = [
  GetUserHandler,
  GetUserProjectHandler,
  GetProjectsByUserIdHandler,
  SearchUsersHandler,
  GetUserOrganizationHandler,
];
