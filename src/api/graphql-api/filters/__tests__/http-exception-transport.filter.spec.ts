import {
  ArgumentsHost,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { HttpExceptionTransportFilter } from 'src/api/graphql-api/filters/http-exception-transport.filter';

interface FakeReply {
  status: number | null;
  body: unknown;
  headersSent: boolean;
}

function createHttpAdapterStub(reply: FakeReply) {
  return {
    isHeadersSent: () => reply.headersSent,
    reply: (_res: unknown, body: unknown, status: number) => {
      reply.status = status;
      reply.body = body;
    },
    end: () => {},
  };
}

function gqlHost(): ArgumentsHost {
  return {
    getType: <T = string>() => 'graphql' as unknown as T,
  } as unknown as ArgumentsHost;
}

function httpHost(): ArgumentsHost {
  const fakeRes = {};
  return {
    getType: <T = string>() => 'http' as unknown as T,
    getArgByIndex: (i: number) => (i === 1 ? fakeRes : null),
    switchToHttp: () => ({ getResponse: () => fakeRes }),
  } as unknown as ArgumentsHost;
}

function makeFilter(reply: FakeReply): HttpExceptionTransportFilter {
  const adapter = createHttpAdapterStub(reply);
  return new HttpExceptionTransportFilter(adapter as never);
}

describe('HttpExceptionTransportFilter', () => {
  describe('GraphQL context', () => {
    function catchAndReturn(
      exception: HttpException,
      host: ArgumentsHost,
    ): unknown {
      const filter = makeFilter({
        status: null,
        body: null,
        headersSent: false,
      });
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

    it('preserves the original message verbatim', () => {
      const thrown = catchAndReturn(
        new ForbiddenException('You are not allowed to read on Project'),
        gqlHost(),
      );
      expect((thrown as GraphQLError).message).toBe(
        'You are not allowed to read on Project',
      );
    });
  });

  describe('HTTP context — replies via adapter, never re-throws', () => {
    it('UnauthorizedException → 401 JSON via adapter.reply', () => {
      const reply: FakeReply = { status: null, body: null, headersSent: false };
      const filter = makeFilter(reply);

      filter.catch(new UnauthorizedException('Bad creds'), httpHost());

      expect(reply.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(reply.body).toEqual(
        expect.objectContaining({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Bad creds',
        }),
      );
    });

    it('ForbiddenException → 403 JSON', () => {
      const reply: FakeReply = { status: null, body: null, headersSent: false };
      const filter = makeFilter(reply);

      filter.catch(new ForbiddenException('Nope'), httpHost());

      expect(reply.status).toBe(HttpStatus.FORBIDDEN);
      expect(reply.body).toEqual(
        expect.objectContaining({ statusCode: 403, message: 'Nope' }),
      );
    });

    it('NotFoundException → 404 JSON (the route-not-found case)', () => {
      const reply: FakeReply = { status: null, body: null, headersSent: false };
      const filter = makeFilter(reply);

      filter.catch(new NotFoundException('Cannot GET /api/health'), httpHost());

      expect(reply.status).toBe(HttpStatus.NOT_FOUND);
      expect(reply.body).toEqual(
        expect.objectContaining({
          statusCode: 404,
          message: 'Cannot GET /api/health',
        }),
      );
    });

    it('does not throw for HTTP context (would otherwise escape to Express finalhandler)', () => {
      const reply: FakeReply = { status: null, body: null, headersSent: false };
      const filter = makeFilter(reply);

      expect(() =>
        filter.catch(new ForbiddenException('No'), httpHost()),
      ).not.toThrow();
    });
  });
});
