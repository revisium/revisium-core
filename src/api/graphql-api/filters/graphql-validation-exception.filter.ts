import { Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { GqlExceptionFilter, GqlContextType } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { ValidationErrorCode } from 'src/features/share/exceptions';

interface StructuredErrorResponse {
  code?: string;
  message?: string;
  details?: unknown;
  context?: unknown;
}

@Catch(BadRequestException)
export class GraphQLValidationExceptionFilter implements GqlExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost): never {
    const contextType = host.getType<GqlContextType>();

    if (contextType !== 'graphql') {
      throw exception;
    }

    const response = exception.getResponse() as StructuredErrorResponse;

    if (this.isStructuredValidationError(response)) {
      throw new GraphQLError(response.message || exception.message, {
        extensions: {
          code: response.code,
          details: response.details,
          context: response.context,
        },
      });
    }

    throw new GraphQLError(this.extractMessage(response, exception));
  }

  private extractMessage(
    response: StructuredErrorResponse | { message?: string | string[] },
    exception: BadRequestException,
  ): string {
    const msg = (response as { message?: string | string[] })?.message;
    if (Array.isArray(msg)) {
      return msg.join(', ');
    }
    if (typeof msg === 'string') {
      return msg;
    }
    return exception.message;
  }

  private isStructuredValidationError(
    response: StructuredErrorResponse,
  ): boolean {
    return Boolean(
      response?.code &&
      Object.values(ValidationErrorCode).includes(
        response.code as (typeof ValidationErrorCode)[keyof typeof ValidationErrorCode],
      ),
    );
  }
}
