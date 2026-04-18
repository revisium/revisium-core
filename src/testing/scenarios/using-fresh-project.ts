import { getTestApp } from 'src/testing/e2e';
import {
  prepareData,
  type PrepareDataReturnType,
} from 'src/testing/utils/prepareProject';

export interface FreshProjectHandle {
  /**
   * Access the current fixture. Only safe to call inside `it` bodies
   * (or `beforeEach` callbacks registered after this one); throws if
   * accessed before the setup hook has run.
   */
  readonly fixture: PrepareDataReturnType;
}

/**
 * Registers a `beforeEach` that seeds a fresh project via `prepareData`
 * against the worker-cached app. Use in mutation auth specs where each
 * case either deletes or mutates the project and must not see state from
 * a sibling test.
 *
 * Must be called at describe scope — Jest's hook registration is
 * lexical.
 *
 * Example:
 *   describe('delete project auth', () => {
 *     const fresh = usingFreshProject();
 *     it('...', () => { fresh.fixture.project.projectName ... });
 *   });
 */
export function usingFreshProject(): FreshProjectHandle {
  let current: PrepareDataReturnType | null = null;

  beforeEach(async () => {
    const app = await getTestApp();
    current = await prepareData(app);
  });

  return {
    get fixture(): PrepareDataReturnType {
      if (!current) {
        throw new Error(
          'usingFreshProject: fixture accessed before beforeEach ran. ' +
            'Make sure the handle is consumed from inside it/beforeEach callbacks.',
        );
      }
      return current;
    },
  };
}
