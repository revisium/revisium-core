import { ValidationError } from 'class-validator';

export function findConstraint(
  errors: ValidationError[],
  prop: string,
  key: string,
): string | undefined {
  const e = errors.find((e) => e.property === prop);
  return e?.constraints?.[key];
}
