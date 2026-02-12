import { Transform } from 'class-transformer';

export function TransformOptionalBoolean(): PropertyDecorator {
  return Transform(({ value }) => {
    if (value === undefined) {
      return undefined;
    }
    return value === 'true' || value === true;
  });
}
