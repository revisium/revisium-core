import { getTestApp } from 'src/testing/e2e';
import { actors, type AuthActorFixture } from './actors';
import { expectAccess } from './expect-access';
import type { AuthMatrixCaseBase, Operation, Transport } from './types';

export interface AuthMatrixBuild<TParams> {
  fixture: AuthActorFixture;
  params: TParams;
  assert?: Partial<Record<Transport, (result: unknown) => void>>;
}

export interface RunAuthMatrixConfig<
  TParams,
  TCase extends AuthMatrixCaseBase,
> {
  op: Operation<TParams>;
  cases: readonly TCase[];
  /**
   * Called once per case, inside the `it` body. Returns the fixture used
   * for actor-token lookup, the operation params, and (optionally) the
   * per-transport assert map to run on the `allowed` path.
   */
  build: (c: TCase) => AuthMatrixBuild<TParams>;
}

/**
 * Wraps `describe.each(op.transports) / it.each(cases)` so a spec only
 * declares its matrix + per-case build. Identical across every auth spec,
 * so lifting it saves ~5-8 lines per consumer.
 */
export function runAuthMatrix<TParams, TCase extends AuthMatrixCaseBase>(
  config: RunAuthMatrixConfig<TParams, TCase>,
): void {
  describe.each(config.op.transports)('via %s', (transport) => {
    it.each(config.cases as TCase[])('$name', async (c) => {
      const { fixture, params, assert } = config.build(c);
      const app = await getTestApp();
      await expectAccess({
        app,
        transport,
        actor: actors.resolveRole(fixture, c.role),
        op: config.op,
        params,
        expected: c.expected,
        assert,
      });
    });
  });
}
