import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { gqlQueryRaw } from 'src/testing/e2e/graphql-helpers';
import { recordTiming } from 'src/testing/e2e/shared-app/timings';
import type { ActorDescriptor, Operation, Outcome, Transport } from './types';

const GQL_ERROR_CODE_BY_OUTCOME: Record<Exclude<Outcome, 'allowed'>, string> = {
  unauthorized: 'UNAUTHENTICATED',
  forbidden: 'FORBIDDEN',
  not_found: 'NOT_FOUND',
};

const REST_STATUS_BY_OUTCOME: Record<Exclude<Outcome, 'allowed'>, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
};

export interface ExpectAccessOptions<TParams> {
  app: INestApplication;
  transport: Transport;
  actor: ActorDescriptor;
  op: Operation<TParams>;
  params: TParams;
  expected: Outcome;
  /**
   * Per-transport assertion callbacks run only when `expected === 'allowed'`.
   * Never attach to forbidden/not_found/unauthorized — content-leakage
   * concerns belong in a dedicated spec.
   */
  assert?: Partial<
    Record<Transport, (result: unknown) => void | Promise<void>>
  >;
}

export async function expectAccess<TParams>(
  options: ExpectAccessOptions<TParams>,
): Promise<void> {
  const { transport } = options;
  if (transport === 'gql') {
    return dispatchGql(options);
  }
  if (transport === 'rest') {
    return dispatchRest(options);
  }
  throw new Error(
    `expectAccess: transport "${transport}" is not yet supported by the auth-permission kit`,
  );
}

async function dispatchGql<TParams>(
  options: ExpectAccessOptions<TParams>,
): Promise<void> {
  const { app, actor, op, params, expected, assert } = options;
  if (!op.gql) {
    throw new Error(
      `expectAccess: operation "${op.id}" has no gql transport defined`,
    );
  }
  const tHttp = Date.now();
  const response = await gqlQueryRaw({
    app,
    query: op.gql.query,
    variables: op.gql.variables(params),
    token: actor.token ?? undefined,
  });
  recordTiming('http:gql', Date.now() - tHttp);

  if (expected === 'allowed') {
    if (response.errors && response.errors.length > 0) {
      throw new Error(
        `expectAccess(${op.id}, gql): expected allowed but got errors: ${JSON.stringify(response.errors)}`,
      );
    }
    await assert?.gql?.(response.data);
    return;
  }

  const expectedCode = GQL_ERROR_CODE_BY_OUTCOME[expected];
  const actualCode = response.errors?.[0]?.extensions?.code;
  if (actualCode !== expectedCode) {
    throw new Error(
      `expectAccess(${op.id}, gql): expected error code ${expectedCode} but got ${
        actualCode ?? 'no error'
      } (errors: ${JSON.stringify(response.errors)})`,
    );
  }
}

async function dispatchRest<TParams>(
  options: ExpectAccessOptions<TParams>,
): Promise<void> {
  const { app, actor, op, params, expected, assert } = options;
  if (!op.rest) {
    throw new Error(
      `expectAccess: operation "${op.id}" has no rest transport defined`,
    );
  }

  const url = op.rest.url(params);
  const req = request(app.getHttpServer())[op.rest.method](url);

  if (actor.token) {
    req.set('Authorization', `Bearer ${actor.token}`);
  }
  if (op.rest.query) {
    req.query(op.rest.query(params));
  }
  if (op.rest.body) {
    req.send(op.rest.body(params) as object);
  }

  const tHttp = Date.now();
  const response = await req;
  recordTiming('http:rest', Date.now() - tHttp);

  if (expected === 'allowed') {
    if (response.status >= 400) {
      throw new Error(
        `expectAccess(${op.id}, rest ${op.rest.method.toUpperCase()} ${url}): expected allowed but got ${response.status}: ${JSON.stringify(response.body)}`,
      );
    }
    await assert?.rest?.(response.body);
    return;
  }

  const expectedStatus = REST_STATUS_BY_OUTCOME[expected];
  if (response.status !== expectedStatus) {
    throw new Error(
      `expectAccess(${op.id}, rest ${op.rest.method.toUpperCase()} ${url}): expected status ${expectedStatus} but got ${response.status}: ${JSON.stringify(response.body)}`,
    );
  }
}
