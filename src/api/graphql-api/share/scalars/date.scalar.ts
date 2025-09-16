import { CustomScalar, Scalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('DateTime', () => Date)
export class DateTimeScalar implements CustomScalar<string, Date> {
  description = 'DateTime scalar that accepts both Date and ISO string';

  parseValue(value: unknown): Date {
    if (typeof value === 'string') return new Date(value);
    if (value instanceof Date) return value;
    throw new Error(`DateTime cannot parse value: ${value}`);
  }

  serialize(value: unknown): string {
    if (typeof value === 'string') return new Date(value).toISOString();
    if (value instanceof Date) return value.toISOString();
    throw new Error(`DateTime cannot serialize value: ${value}`);
  }

  parseLiteral(ast: ValueNode): Date {
    if (ast.kind === Kind.STRING) return new Date(ast.value);
    throw new Error(`DateTime cannot parse literal: ${ast.kind}`);
  }
}
