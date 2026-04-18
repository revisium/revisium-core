import type {
  GqlOperationShape,
  Operation,
  RestOperationShape,
  Transport,
} from './types';

/**
 * Builds an Operation. `transports` is derived from which shapes were
 * supplied so the matrix `describe.each(op.transports)` naturally skips
 * transports the endpoint does not expose.
 */
export function operation<TParams>(config: {
  id: string;
  gql?: GqlOperationShape<TParams>;
  rest?: RestOperationShape<TParams>;
}): Operation<TParams> {
  const transports: Transport[] = [];
  if (config.rest) transports.push('rest');
  if (config.gql) transports.push('gql');

  if (transports.length === 0) {
    throw new Error(
      `operation("${config.id}") declared no transports — pass at least one of { gql, rest }`,
    );
  }

  return {
    id: config.id,
    gql: config.gql,
    rest: config.rest,
    transports,
  };
}
