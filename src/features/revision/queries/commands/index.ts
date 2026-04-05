import { GetEndpointsByRevisionIdHandler } from 'src/features/revision/queries/commands/get-endpoints-by-revision-id.handler';
import { ResolveBranchByRevisionHandler } from 'src/features/revision/queries/commands/resolve-branch-by-revision.handler';
import { ResolveChildBranchesByRevisionHandler } from 'src/features/revision/queries/commands/resolve-child-branches-by-revision.handler';

export const REVISION_QUERIES_HANDLERS = [
  ResolveBranchByRevisionHandler,
  GetEndpointsByRevisionIdHandler,
  ResolveChildBranchesByRevisionHandler,
];
