import { CreateRevisionHandler } from './create-revision.handler';
import { RevertChangesHandler } from './revert-changes.handler';

export const REVISION_COMMAND_HANDLERS = [
  CreateRevisionHandler,
  RevertChangesHandler,
] as const;
