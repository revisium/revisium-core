import type { Transport } from './types';

type AssertMap = Partial<Record<Transport, (result: unknown) => void>>;

/**
 * Boolean-success assert for mutations that return
 *   - REST: `{ success: true }`
 *   - GQL:  `{ [mutationField]: true }`
 *
 * Usage:
 *   assert: booleanMutationAssert('deleteProject'),
 */
export function booleanMutationAssert(gqlMutationField: string): AssertMap {
  return {
    gql: (data) => {
      const value = (data as Record<string, unknown>)[gqlMutationField];
      expect(value).toBe(true);
    },
    rest: (body) => {
      expect((body as { success: boolean }).success).toBe(true);
    },
  };
}
