import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { ValidationErrorCode } from '@revisium/engine';
import { GraphQLValidationExceptionFilter } from 'src/api/graphql-api/filters/graphql-validation-exception.filter';

const hostOfType = (type: string): ArgumentsHost =>
  ({
    getType: <T = string>() => type as unknown as T,
  }) as unknown as ArgumentsHost;

describe('GraphQLValidationExceptionFilter', () => {
  const filter = new GraphQLValidationExceptionFilter();

  it('rethrows the original exception when context is not graphql', () => {
    const exception = new BadRequestException({ message: 'bad' });
    expect(() => filter.catch(exception, hostOfType('http'))).toThrow(
      exception,
    );
  });

  it('throws a GraphQLError with extensions when the response is a structured validation error', () => {
    const exception = new BadRequestException({
      code: ValidationErrorCode.INVALID_DATA,
      message: 'Validation failed',
      details: { field: 'name' },
      context: { tableId: 't1' },
    });

    let caught: GraphQLError | undefined;
    try {
      filter.catch(exception, hostOfType('graphql'));
    } catch (e) {
      caught = e as GraphQLError;
    }

    expect(caught).toBeInstanceOf(GraphQLError);
    expect(caught?.message).toBe('Validation failed');
    expect(caught?.extensions).toEqual({
      code: ValidationErrorCode.INVALID_DATA,
      details: { field: 'name' },
      context: { tableId: 't1' },
    });
  });

  it('falls back to exception.message when the structured response has no message field', () => {
    const exception = new BadRequestException({
      code: ValidationErrorCode.FOREIGN_KEY_NOT_FOUND,
      details: { fk: 'x' },
    });

    let caught: GraphQLError | undefined;
    try {
      filter.catch(exception, hostOfType('graphql'));
    } catch (e) {
      caught = e as GraphQLError;
    }

    expect(caught).toBeInstanceOf(GraphQLError);
    expect(caught?.message).toBe(exception.message);
    expect(caught?.extensions?.code).toBe(
      ValidationErrorCode.FOREIGN_KEY_NOT_FOUND,
    );
  });

  it('joins an array message into a comma-separated string for non-structured responses', () => {
    const exception = new BadRequestException({
      message: ['name must be a string', 'age must be a number'],
    });

    expect(() => filter.catch(exception, hostOfType('graphql'))).toThrow(
      'name must be a string, age must be a number',
    );
  });

  it('uses a string message verbatim for non-structured responses', () => {
    const exception = new BadRequestException({ message: 'plain text' });

    expect(() => filter.catch(exception, hostOfType('graphql'))).toThrow(
      'plain text',
    );
  });

  it('falls back to exception.message when the response has no message at all', () => {
    const exception = new BadRequestException({ statusCode: 400 });

    let caught: GraphQLError | undefined;
    try {
      filter.catch(exception, hostOfType('graphql'));
    } catch (e) {
      caught = e as GraphQLError;
    }

    expect(caught).toBeInstanceOf(GraphQLError);
    expect(caught?.message).toBe(exception.message);
  });

  it('treats a structured-looking response with an unknown code as non-structured', () => {
    const exception = new BadRequestException({
      code: 'NOT_A_VALIDATION_CODE',
      message: 'still wrapped',
    });

    let caught: GraphQLError | undefined;
    try {
      filter.catch(exception, hostOfType('graphql'));
    } catch (e) {
      caught = e as GraphQLError;
    }

    expect(caught).toBeInstanceOf(GraphQLError);
    expect(caught?.message).toBe('still wrapped');
    expect(caught?.extensions?.code).toBeUndefined();
  });
});
