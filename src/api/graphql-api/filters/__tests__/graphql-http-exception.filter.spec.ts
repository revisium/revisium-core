import {
  ArgumentsHost,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { GraphQLHttpExceptionFilter } from 'src/api/graphql-api/filters/graphql-http-exception.filter';

function gqlHost(): ArgumentsHost {
  return {
    getType: <T = string>() => 'graphql' as unknown as T,
  } as unknown as ArgumentsHost;
}

function httpHost(): ArgumentsHost {
  return {
    getType: <T = string>() => 'http' as unknown as T,
  } as unknown as ArgumentsHost;
}

describe('GraphQLHttpExceptionFilter', () => {
  const filter = new GraphQLHttpExceptionFilter();

  function catchAndReturn(
    exception: HttpException,
    host: ArgumentsHost,
  ): unknown {
    try {
      filter.catch(exception, host);
    } catch (err) {
      return err;
    }
    throw new Error('filter.catch() did not throw');
  }

  it('maps UnauthorizedException to UNAUTHENTICATED extensions.code', () => {
    const thrown = catchAndReturn(
      new UnauthorizedException('No token'),
      gqlHost(),
    );
    expect(thrown).toBeInstanceOf(GraphQLError);
    expect((thrown as GraphQLError).message).toBe('No token');
    expect((thrown as GraphQLError).extensions.code).toBe('UNAUTHENTICATED');
  });

  it('maps ForbiddenException to FORBIDDEN extensions.code', () => {
    const thrown = catchAndReturn(
      new ForbiddenException('You are not allowed'),
      gqlHost(),
    );
    expect((thrown as GraphQLError).extensions.code).toBe('FORBIDDEN');
    expect((thrown as GraphQLError).message).toBe('You are not allowed');
  });

  it('maps NotFoundException to NOT_FOUND extensions.code', () => {
    const thrown = catchAndReturn(new NotFoundException('Gone'), gqlHost());
    expect((thrown as GraphQLError).extensions.code).toBe('NOT_FOUND');
  });

  it('rethrows the original exception in non-GraphQL contexts (REST/MCP)', () => {
    const original = new ForbiddenException('No');
    const thrown = catchAndReturn(original, httpHost());
    expect(thrown).toBe(original);
  });

  it('preserves the original message verbatim so regex-based tests keep matching', () => {
    const thrown = catchAndReturn(
      new ForbiddenException('You are not allowed to read on Project'),
      gqlHost(),
    );
    expect((thrown as GraphQLError).message).toBe(
      'You are not allowed to read on Project',
    );
  });
});
