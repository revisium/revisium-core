import type { AuthMatrixCaseBase } from './types';

/**
 * Mutation under project-scope authorization: owner allowed, cross-owner
 * forbidden (authenticated but not a member), anon unauthorized
 * (no credentials).
 *
 * Used for delete/update/create on project-scoped resources like branch,
 * table, row, endpoint, project-user management.
 */
export const PROJECT_MUTATION_MATRIX: AuthMatrixCaseBase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'cross-owner', role: 'crossOwner', expected: 'forbidden' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

/** Mutation at org scope — same shape as project mutations. */
export const ORG_MUTATION_MATRIX = PROJECT_MUTATION_MATRIX;

/**
 * Denial-only subset of PROJECT_MUTATION_MATRIX. The owner-allowed case
 * actually runs the mutation (DB write, slow), so when the happy path
 * is already covered elsewhere (e.g. draft-roles.spec.ts) we use this
 * to verify just the guard behavior. Pairs naturally with
 * `usingSharedProject()` since no case mutates state.
 */
export const PROJECT_MUTATION_DENIAL_MATRIX: AuthMatrixCaseBase[] = [
  { name: 'cross-owner', role: 'crossOwner', expected: 'forbidden' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

export type ProjectVisibility = 'private' | 'public';

export interface ProjectVisibilityCase extends AuthMatrixCaseBase {
  project: ProjectVisibility;
}

/**
 * Readonly on a project-scoped resource where visibility matters:
 *
 *   Private project: owner allowed, everyone else forbidden.
 *   Public  project: everyone allowed (anon included).
 *
 * Used for get-project, get-branch, get-revision, list-branches,
 * list-tables, get-migrations, revision-changes, sub-schema, etc.
 */
export const PROJECT_VISIBILITY_MATRIX: ProjectVisibilityCase[] = [
  {
    name: 'private — owner',
    project: 'private',
    role: 'owner',
    expected: 'allowed',
  },
  {
    name: 'private — cross-owner',
    project: 'private',
    role: 'crossOwner',
    expected: 'forbidden',
  },
  {
    name: 'private — anonymous',
    project: 'private',
    role: 'anonymous',
    expected: 'forbidden',
  },
  {
    name: 'public  — owner',
    project: 'public',
    role: 'owner',
    expected: 'allowed',
  },
  {
    name: 'public  — cross-owner',
    project: 'public',
    role: 'crossOwner',
    expected: 'allowed',
  },
  {
    name: 'public  — anonymous',
    project: 'public',
    role: 'anonymous',
    expected: 'allowed',
  },
];

/**
 * Readonly PII sub-resource (users list, etc). Both private and public
 * projects require membership; anon short-circuits at auth.
 */
export const PROJECT_PII_READ_MATRIX: AuthMatrixCaseBase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'cross-owner', role: 'crossOwner', expected: 'forbidden' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];
