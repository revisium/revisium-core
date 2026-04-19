import { getTestApp } from 'src/testing/e2e';
import {
  prepareData,
  type PrepareDataReturnType,
} from 'src/testing/utils/prepareProject';

export interface SharedProjectHandle {
  readonly fixture: PrepareDataReturnType;
}

/**
 * `beforeAll`-based fixture for describe blocks whose cases never
 * mutate state (read-only or denial-only auth checks). For mutation
 * specs use `usingFreshProject()` so each case gets a clean slate.
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
