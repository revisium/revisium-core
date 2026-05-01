import {
  ArgumentsHost,
  Catch,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { GqlContextType, GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

/**
 * Translates the three transport-level exceptions
 * (Unauthorized / Forbidden / NotFound) into the right shape for the
 * active transport.
 *
 * Why this is a single filter, not two:
 *   Nest selects exactly one filter per exception via `filters.find(...)`
 *   and never chains. If a graphql-only filter were registered globally
 *   and re-threw on HTTP context, the throw would escape Nest entirely
 *   and reach Express's `finalhandler`, which renders HTML — leaking
 *   stack traces and breaking JSON consumers. Splitting into two filters
 *   would only work by relying on registration order, which is fragile
 *   and not obvious to readers.
 *
 * Why extending BaseExceptionFilter for HTTP:
 *   `BaseExceptionFilter.catch()` is Nest's documented default for
 *   HttpException. It produces `{ statusCode, message }` JSON via the
 *   adapter's reply method, with no stack-trace leak.
 *
 * GraphQL branch: wraps as GraphQLError with semantic `extensions.code`
 * so clients can branch on (UNAUTHENTICATED / FORBIDDEN / NOT_FOUND).
 */
@Catch(UnauthorizedException, ForbiddenException, NotFoundException)
export class HttpExceptionTransportFilter
  extends BaseExceptionFilter
  implements GqlExceptionFilter
{
  catch(exception: HttpException, host: ArgumentsHost) {
    if (host.getType<GqlContextType>() !== 'graphql') {
      return super.catch(exception, host);
    }

    throw new GraphQLError(exception.message, {
      extensions: { code: codeFor(exception) },
    });
  }
}

function codeFor(exception: HttpException): string {
  if (exception instanceof UnauthorizedException) {
    return 'UNAUTHENTICATED';
  }
  if (exception instanceof ForbiddenException) {
    return 'FORBIDDEN';
  }
  if (exception instanceof NotFoundException) {
    return 'NOT_FOUND';
  }
  return 'INTERNAL_SERVER_ERROR';
}
