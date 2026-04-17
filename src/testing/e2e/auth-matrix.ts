import type { ActorRole } from './gql-query-kit';

export type AuthOutcome = 'ok' | 'forbidden' | 'notFound';

export interface AuthMatrixCase {
  role: ActorRole;
  outcome: AuthOutcome;
  label?: string;
}

export interface AuthMatrixOptions {
  /**
   * Override the default label for each case. Defaults to something like
   * "owner can access" / "cross-owner is forbidden" / "anon is forbidden".
   */
  label?: (c: AuthMatrixCase) => string;
}

const DEFAULT_LABELS: Record<ActorRole, Record<AuthOutcome, string>> = {
  owner: {
    ok: 'owner can access',
    forbidden: 'owner is forbidden',
    notFound: 'owner gets not found',
  },
  crossOwner: {
    ok: 'cross-owner can access',
    forbidden: 'cross-owner is forbidden',
    notFound: 'cross-owner gets not found',
  },
  anon: {
    ok: 'anon can access',
    forbidden: 'anon is forbidden',
    notFound: 'anon gets not found',
  },
};

function defaultLabel(c: AuthMatrixCase): string {
  return c.label ?? DEFAULT_LABELS[c.role][c.outcome];
}

/**
 * Declarative auth matrix runner. Each case describes an (actor, expected
 * outcome) pair; `runCase` receives the role and outcome so it can dispatch
 * through a `gqlKit` actor. Lives here (not in kit) so REST / other transports
 * can reuse the same matrix shape.
 */
export function describeAuthMatrix(
  label: string,
  cases: AuthMatrixCase[],
  runCase: (c: AuthMatrixCase) => Promise<void>,
  options: AuthMatrixOptions = {},
): void {
  const labelFor = options.label ?? defaultLabel;

  describe(label, () => {
    for (const c of cases) {
      it(labelFor(c), () => runCase(c));
    }
  });
}

/** Standard private-resource matrix: owner OK, cross-owner forbidden, anon forbidden. */
export const PRIVATE_RESOURCE_MATRIX: AuthMatrixCase[] = [
  { role: 'owner', outcome: 'ok' },
  { role: 'crossOwner', outcome: 'forbidden' },
  { role: 'anon', outcome: 'forbidden' },
];

/** Standard public-resource matrix: everyone can read. */
export const PUBLIC_RESOURCE_MATRIX: AuthMatrixCase[] = [
  { role: 'owner', outcome: 'ok' },
  { role: 'crossOwner', outcome: 'ok' },
  { role: 'anon', outcome: 'ok' },
];
