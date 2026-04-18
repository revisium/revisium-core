import {
  ArgumentsHost,
  Catch,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlContextType, GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch(UnauthorizedException, ForbiddenException, NotFoundException)
export class GraphQLHttpExceptionFilter implements GqlExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): never {
    const contextType = host.getType<GqlContextType>();

    if (contextType !== 'graphql') {
      throw exception;
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
