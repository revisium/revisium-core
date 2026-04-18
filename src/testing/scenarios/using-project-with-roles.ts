import { getTestApp } from 'src/testing/e2e';
import {
  prepareDataWithRoles,
  type PrepareDataWithRolesReturnType,
} from 'src/testing/utils/prepareProject';

export interface ProjectWithRolesHandle {
  /**
   * Current fixture, populated in a `beforeEach`. Throws if read before
   * the hook runs.
   */
  readonly fixture: PrepareDataWithRolesReturnType;
}

/**
 * Registers a `beforeEach` that seeds a project with all member roles:
 * `owner` / `developer` / `editor` / `reader` plus a cross-org
 * `anotherOwner`. Use for role-tier auth matrices where the kit needs
 * access to the full set of project member tokens.
 *
 * Must be called at describe scope.
 */
export function usingProjectWithRoles(): ProjectWithRolesHandle {
  let current: PrepareDataWithRolesReturnType | null = null;

  beforeEach(async () => {
    const app = await getTestApp();
    current = await prepareDataWithRoles(app);
  });

  return {
    get fixture(): PrepareDataWithRolesReturnType {
      if (!current) {
        throw new Error(
          'usingProjectWithRoles: fixture accessed before beforeEach ran.',
        );
      }
      return current;
    },
  };
}
