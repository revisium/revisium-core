import { FindProjectInOrganizationOrThrowHandler } from 'src/share/queries/handlers/transactional/find-project-in-organization-or-throw.handler';
import { FindRowsInTableOrThrowHandler } from 'src/share/queries/handlers/transactional/find-rows-in-table-or-throw.handler';
import { GetTableSchemaHandler } from 'src/share/queries/handlers/transactional/get-table-schema.handler';
import { FindBranchInProjectOrThrowHandler } from './transactional/find-branch-in-project-or-throw.handler';
import { FindDraftRevisionInBranchOrThrowHandler } from './transactional/find-draft-revision-in-branch-or-throw.handler';
import { FindHeadRevisionInBranchOrThrowHandler } from './transactional/find-head-revision-in-branch-or-throw.handler';
import { FindRowInTableOrThrowHandler } from './transactional/find-row-in-table-or-throw.handler';
import { FindTableInRevisionOrThrowHandler } from './transactional/find-table-in-revision-or-throw.handler';

export const SHARE_QUERIES_HANDLERS = [
  FindRowInTableOrThrowHandler,
  FindRowsInTableOrThrowHandler,
  FindTableInRevisionOrThrowHandler,
  FindBranchInProjectOrThrowHandler,
  FindDraftRevisionInBranchOrThrowHandler,
  FindHeadRevisionInBranchOrThrowHandler,
  FindProjectInOrganizationOrThrowHandler,
  GetTableSchemaHandler,
];
