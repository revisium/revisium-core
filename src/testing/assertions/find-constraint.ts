import { ValidationError } from 'class-validator';

export function findConstraint(
  errors: ValidationError[],
  property: string,
  constraintKey: string,
): string | undefined {
  // Recursive search for a ValidationError with given property
  const stack: ValidationError[] = [...errors];
  while (stack.length) {
    const e = stack.pop()!;
    if (
      e.property === property &&
      e.constraints &&
      e.constraints[constraintKey]
    ) {
      return e.constraints[constraintKey];
    }
    if (e.children && e.children.length) {
      stack.push(...e.children);
    }
  }
  return undefined;
}
