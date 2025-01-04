import { ApiCreateBranchByRevisionIdHandler } from 'src/features/branch/commands/handlers/api-create-branch-by-revision-id.handler';
import { CreateBranchByRevisionIdHandler } from 'src/features/branch/commands/handlers/create-branch-by-revision-id.handler';

export const BRANCH_COMMANDS_HANDLERS = [
  CreateBranchByRevisionIdHandler,
  ApiCreateBranchByRevisionIdHandler,
];
