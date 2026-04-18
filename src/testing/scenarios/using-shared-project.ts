import { getTestApp } from 'src/testing/e2e';
import {
  prepareData,
  type PrepareDataReturnType,
} from 'src/testing/utils/prepareProject';

export interface SharedProjectHandle {
  readonly fixture: PrepareDataReturnType;
}

/**
 * Registers a `beforeAll` that seeds one project via `prepareData` and
 * reuses it across every test in the enclosing describe block.
 *
 * Use this in **read-only** or **denial-only** auth specs (e.g. cases
 * from `PROJECT_VISIBILITY_MATRIX` or just cross-owner/anonymous on any
 * mutation endpoint) — the fixture isn't mutated, so a single seeding
 * is enough.
 *
 * For specs where any case mutates state (e.g. owner-allowed running a
 * DELETE), keep `usingFreshProject()` so each test gets a clean slate.
 */
export function usingSharedProject(): SharedProjectHandle {
  let current: PrepareDataReturnType | null = null;

  beforeAll(async () => {
    const app = await getTestApp();
    current = await prepareData(app);
  });

  return {
    get fixture(): PrepareDataReturnType {
      if (!current) {
        throw new Error(
          'usingSharedProject: fixture accessed before beforeAll ran.',
        );
      }
      return current;
    },
  };
}
