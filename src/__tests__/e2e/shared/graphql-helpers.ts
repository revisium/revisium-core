import { INestApplication } from '@nestjs/common';
import request from 'supertest';

const GRAPHQL_URL = '/graphql';

export interface GraphQLQueryOptions {
  app: INestApplication;
  query: string;
  variables?: Record<string, unknown>;
  token?: string;
}

export async function gqlQuery<T = Record<string, any>>(
  options: GraphQLQueryOptions,
): Promise<T> {
  const req = request(options.app.getHttpServer()).post(GRAPHQL_URL);

  if (options.token) {
    req.set('Authorization', `Bearer ${options.token}`);
  }

  const res = await req.send({
    query: options.query,
    variables: options.variables,
  });

  if (res.status !== 200) {
    throw new Error(
      `GraphQL request failed with status ${res.status}: ${JSON.stringify(res.body)}`,
    );
  }

  const body = res.body as { data?: T; errors?: Array<{ message: string }> };

  if (body.errors && body.errors.length > 0) {
    throw new Error(`GraphQL Error: ${body.errors[0].message}`);
  }

  return body.data as T;
}

export async function gqlQueryExpectError(
  options: GraphQLQueryOptions,
  errorPattern: RegExp,
): Promise<void> {
  const req = request(options.app.getHttpServer()).post(GRAPHQL_URL);

  if (options.token) {
    req.set('Authorization', `Bearer ${options.token}`);
  }

  await req
    .send({
      query: options.query,
      variables: options.variables,
    })
    .expect(200)
    .expect(errorPattern);
}

export interface GraphQLErrorResponse {
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: {
      code?: string;
      details?: unknown;
      context?: unknown;
      originalError?: unknown;
      [key: string]: unknown;
    };
  }>;
  data: unknown;
}

export async function gqlQueryRaw(
  options: GraphQLQueryOptions,
): Promise<GraphQLErrorResponse> {
  const req = request(options.app.getHttpServer()).post(GRAPHQL_URL);

  if (options.token) {
    req.set('Authorization', `Bearer ${options.token}`);
  }

  const res = await req.send({
    query: options.query,
    variables: options.variables,
  });

  return res.body as GraphQLErrorResponse;
}

export function expectGraphQLFields(
  data: Record<string, unknown>,
  rootField: string,
  expectedFields: string[],
): void {
  const root = data[rootField] as Record<string, unknown>;
  expect(root).toBeDefined();

  for (const field of expectedFields) {
    expect(root).toHaveProperty(field);
  }
}
