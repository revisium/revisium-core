import { Transform } from 'class-transformer';

export function TransformOptionalBoolean(): PropertyDecorator {
  return Transform(({ value }) => {
    if (value === undefined) {
      return undefined;
    }
    if (value === 'true' || value === true) {
      return true;
    }
    if (value === 'false' || value === false) {
      return false;
    }
    return value;
  });
}
