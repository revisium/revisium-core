export type Transport = 'rest' | 'gql';

/**
 * Normalised outcome vocabulary the kit maps each transport's native error
 * signal into:
 *
 *   REST:    401 → 'unauthorized' | 403 → 'forbidden' | 404 → 'not_found' | 2xx → 'allowed'
 *   GraphQL: errors[0].extensions.code in { UNAUTHENTICATED, FORBIDDEN, NOT_FOUND }
 *            or no errors → 'allowed'
 *
 * Tests never branch on transport — they describe *business* outcomes.
 */
export type Outcome = 'unauthorized' | 'forbidden' | 'not_found' | 'allowed';

export type RestMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type ActorRole = 'owner' | 'crossOwner' | 'anonymous';

export interface GqlOperationShape<TParams> {
  query: string;
  variables: (params: TParams) => Record<string, unknown>;
}

export interface RestOperationShape<TParams> {
  method: RestMethod;
  url: (params: TParams) => string;
  body?: (params: TParams) => unknown;
  /**
   * Query-string params for controllers using `@Query()` DTOs. Supertest
   * serialises via `.query()`. Keep to `string | number | boolean`; nested
   * objects fall outside NestJS's class-validator pipeline.
   */
  query?: (params: TParams) => Record<string, string | number | boolean>;
}

export interface Operation<TParams> {
  id: string;
  gql?: GqlOperationShape<TParams>;
  rest?: RestOperationShape<TParams>;
  transports: Transport[];
}

export interface ActorDescriptor {
  token: string | null;
  label?: string;
}

/**
 * Common shape every auth-matrix case carries. Specs extend with extra
 * columns (e.g. `project: 'private' | 'public'`) via intersection:
 *
 *   type Case = AuthMatrixCaseBase & { project: 'private' | 'public' };
 */
export interface AuthMatrixCaseBase {
  name: string;
  role: ActorRole;
  expected: Outcome;
}
