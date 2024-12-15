import { ResolveBranchByRevisionHandler } from 'src/revision/queries/commands/resolve-branch-by-revision.handler';
import { GetChildrenByRevisionHandler } from 'src/revision/queries/commands/get-children-by-revision.handler';
import { GetEndpointsByRevisionIdHandler } from 'src/revision/queries/commands/get-endpoints-by-revision-id.handler';
import { ResolveChildBranchesByRevisionHandler } from 'src/revision/queries/commands/resolve-child-branches-by-revision.handler';
import { ResolveChildByRevisionHandler } from 'src/revision/queries/commands/resolve-child-by-revision.handler';
import { ResolveParentByRevisionHandler } from 'src/revision/queries/commands/resolve-parent-by-revision.handler';
import { GetRevisionHandler } from 'src/revision/queries/commands/get-revision.handler';
import { GetTablesByRevisionIdHandler } from 'src/revision/queries/commands/get-tables-by-revision-id.handler';

export const REVISION_QUERIES_HANDLERS = [
  GetRevisionHandler,
  ResolveParentByRevisionHandler,
  ResolveChildByRevisionHandler,
  GetChildrenByRevisionHandler,
  GetTablesByRevisionIdHandler,
  ResolveBranchByRevisionHandler,
  GetEndpointsByRevisionIdHandler,
  ResolveChildBranchesByRevisionHandler,
];
