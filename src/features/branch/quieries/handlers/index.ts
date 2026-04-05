import { GetBranchHandler } from 'src/features/branch/quieries/handlers/get-branch.handler';
import { GetBranchesHandler } from 'src/features/branch/quieries/handlers/get-branches.handler';
import { GetProjectByBranchHandler } from 'src/features/branch/quieries/handlers/get-project-by-branch.handler';
import { ResolveParentBranchByBranchHandler } from 'src/features/branch/quieries/handlers/resolve-parent-branch-by-branch.handler';

export const BRANCH_QUERIES_HANDLERS = [
  GetBranchHandler,
  GetBranchesHandler,
  GetProjectByBranchHandler,
  ResolveParentBranchByBranchHandler,
];
