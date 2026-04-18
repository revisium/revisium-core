export type {
  Transport,
  Outcome,
  Operation,
  GqlOperationShape,
  RestOperationShape,
  RestMethod,
  ActorRole,
  ActorDescriptor,
  AuthMatrixCaseBase,
} from './types';
export { operation } from './operation';
export { actors, type AuthActorFixture } from './actors';
export { expectAccess, type ExpectAccessOptions } from './expect-access';
export { booleanMutationAssert } from './assertions';
export {
  runAuthMatrix,
  type RunAuthMatrixConfig,
  type AuthMatrixBuild,
} from './run-auth-matrix';
export {
  PROJECT_MUTATION_MATRIX,
  ORG_MUTATION_MATRIX,
  PROJECT_VISIBILITY_MATRIX,
  PROJECT_PII_READ_MATRIX,
  type ProjectVisibility,
  type ProjectVisibilityCase,
} from './matrices';
