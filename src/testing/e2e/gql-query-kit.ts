import { INestApplication } from '@nestjs/common';
import {
  gqlQuery,
  gqlQueryExpectError,
  gqlQueryRaw,
  type GraphQLErrorResponse,
} from './graphql-helpers';

type Vars = Record<string, unknown> | undefined;

export interface GqlActor {
  expectOk: <T = Record<string, any>>(
    query: string,
    variables?: Vars,
  ) => Promise<T>;
  expectError: (
    query: string,
    variables: Vars,
    errorPattern: RegExp,
  ) => Promise<void>;
  expectForbidden: (query: string, variables?: Vars) => Promise<void>;
  expectNotFound: (query: string, variables?: Vars) => Promise<void>;
  raw: (query: string, variables?: Vars) => Promise<GraphQLErrorResponse>;
}

export interface AuthFixture {
  owner: { token: string };
  anotherOwner: { token: string };
}

export type ActorRole = 'owner' | 'crossOwner' | 'anon';

export interface GqlKit {
  actor: (token?: string) => GqlActor;
  owner: (fixture: AuthFixture) => GqlActor;
  crossOwner: (fixture: AuthFixture) => GqlActor;
  anon: () => GqlActor;
  roleFor: (fixture: AuthFixture, role: ActorRole) => GqlActor;
}

const FORBIDDEN_PATTERN = /You are not allowed/i;
const NOT_FOUND_PATTERN = /not found/i;

export function gqlKit(app: INestApplication): GqlKit {
  const actor = (token?: string): GqlActor => ({
    expectOk: <T = Record<string, any>>(query: string, variables?: Vars) =>
      gqlQuery<T>({ app, token, query, variables }),
    expectError: (query, variables, errorPattern) =>
      gqlQueryExpectError({ app, token, query, variables }, errorPattern),
    expectForbidden: (query, variables) =>
      gqlQueryExpectError({ app, token, query, variables }, FORBIDDEN_PATTERN),
    expectNotFound: (query, variables) =>
      gqlQueryExpectError({ app, token, query, variables }, NOT_FOUND_PATTERN),
    raw: (query, variables) => gqlQueryRaw({ app, token, query, variables }),
  });

  const roleFor = (fixture: AuthFixture, role: ActorRole): GqlActor => {
    switch (role) {
      case 'owner':
        return actor(fixture.owner.token);
      case 'crossOwner':
        return actor(fixture.anotherOwner.token);
      case 'anon':
        return actor(undefined);
      default: {
        const exhaustive: never = role;
        throw new Error(`Unknown actor role: ${String(exhaustive)}`);
      }
    }
  };

  return {
    actor,
    owner: (fixture) => actor(fixture.owner.token),
    crossOwner: (fixture) => actor(fixture.anotherOwner.token),
    anon: () => actor(undefined),
    roleFor,
  };
}
