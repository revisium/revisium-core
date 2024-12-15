import { GetBranchByIdHandler } from 'src/branch/quieries/handlers/get-branch-by-id.handler';
import { GetBranchHandler } from 'src/branch/quieries/handlers/get-branch.handler';
import { GetBranchesHandler } from 'src/branch/quieries/handlers/get-branches.handler';
import { GetDraftRevisionHandler } from 'src/branch/quieries/handlers/get-draft-revision.handler';
import { GetHeadRevisionHandler } from 'src/branch/quieries/handlers/get-head-revision.handler';
import { GetProjectByBranchHandler } from 'src/branch/quieries/handlers/get-project-by-branch.handler';
import { GetRevisionsByBranchIdHandler } from 'src/branch/quieries/handlers/get-revisions-by-branch-id.handler';
import { GetStartRevisionHandler } from 'src/branch/quieries/handlers/get-start-revision.handler';
import { GetTouchedByBranchIdHandler } from 'src/branch/quieries/handlers/get-touched-by-branch-id.handler';
import { ResolveParentBranchByBranchHandler } from 'src/branch/quieries/handlers/resolve-parent-branch-by-branch.handler';

export const BRANCH_QUERIES_HANDLERS = [
  GetBranchHandler,
  GetBranchByIdHandler,
  GetRevisionsByBranchIdHandler,
  GetBranchesHandler,
  GetHeadRevisionHandler,
  GetProjectByBranchHandler,
  GetDraftRevisionHandler,
  GetTouchedByBranchIdHandler,
  GetStartRevisionHandler,
  ResolveParentBranchByBranchHandler,
];
