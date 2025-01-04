import { GetAllBranchesByProjectHandler } from 'src/features/project/queries/handlers/get-all-branches-by-project.handler';
import { GetProjectByIdHandler } from 'src/features/project/queries/handlers/get-project-by-id.handler';
import { GetProjectHandler } from 'src/features/project/queries/handlers/get-project.handler';
import { GetRootBranchByProjectHandler } from 'src/features/project/queries/handlers/get-root-branch-by-project.handler';
import { GetUsersProjectHandler } from 'src/features/project/queries/handlers/get-users-project.handler';

export const PROJECT_QUERIES = [
  GetProjectHandler,
  GetRootBranchByProjectHandler,
  GetAllBranchesByProjectHandler,
  GetProjectByIdHandler,
  GetUsersProjectHandler,
];
