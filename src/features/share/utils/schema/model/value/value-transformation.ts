import { JsonArrayStore } from 'src/features/share/utils/schema/model/schema/json-array.store';
import { JsonSchemaStore } from 'src/features/share/utils/schema/model/schema/json-schema.store';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

export const equel = (value: unknown): unknown => value;

export const fromNumberToString = (
  value: number,
  defaultValue: string = '',
): string => value.toString() || defaultValue;

export const fromBooleanToString = (
  value: boolean,
  defaultValue: string = '',
): string => value.toString() || defaultValue;

export const fromStringToBoolean = (
  value: string,
  defaultValue: boolean = false,
): boolean => {
  if (!value) {
    return defaultValue;
  }

  if (value.toLowerCase() === 'false') {
    return false;
  }

  return true;
};

export const fromStringToNumber = (
  value: string,
  defaultValue: number = 0,
): number => {
  const number = parseFloat(value);

  if (isNaN(number)) {
    return defaultValue;
  }

  return number;
};

export const fromBooleanToNumber = (value: boolean): number => {
  return value ? 1 : 0;
};

export const fromNumberToBoolean = (value: number): boolean => {
  return Boolean(value);
};

export const toArrayTransformation =
  (transformation: Transformation) => (value: unknown) => {
    const result = transformation(value);
    return [result];
  };

export const fromArrayTransformation =
  (transformation: Transformation) => (value: unknown) => {
    if (Array.isArray(value) && value.length) {
      return transformation(value[0]);
    }
    return undefined;
  };

const replaceTransformationsMapper: ReplaceTransformationsMapper = [
  {
    fromType: JsonSchemaTypeName.Number,
    toType: JsonSchemaTypeName.String,
    transformation: fromNumberToString,
  },
  {
    fromType: JsonSchemaTypeName.String,
    toType: JsonSchemaTypeName.Number,
    transformation: fromStringToNumber,
  },
  {
    fromType: JsonSchemaTypeName.Boolean,
    toType: JsonSchemaTypeName.String,
    transformation: fromBooleanToString,
  },
  {
    fromType: JsonSchemaTypeName.String,
    toType: JsonSchemaTypeName.Boolean,
    transformation: fromStringToBoolean,
  },
  {
    fromType: JsonSchemaTypeName.Boolean,
    toType: JsonSchemaTypeName.Number,
    transformation: fromBooleanToNumber,
  },
  {
    fromType: JsonSchemaTypeName.Number,
    toType: JsonSchemaTypeName.Boolean,
    transformation: fromNumberToBoolean,
  },
];
export const getTransformation = (
  from: JsonSchemaStore,
  to: JsonSchemaStore,
): Transformation | undefined => {
  if (to instanceof JsonArrayStore) {
    const transformation = findTransformation(from.type, to.items.type);

    if (!transformation) {
      return;
    }

    return toArrayTransformation(transformation);
  } else if (from instanceof JsonArrayStore) {
    const transformation = findTransformation(from.items.type, to.type);

    if (!transformation) {
      return;
    }

    return fromArrayTransformation(transformation);
  }

  return findTransformation(from.type, to.type);
};

const findTransformation = (
  from: JsonSchemaTypeName,
  to: JsonSchemaTypeName,
): Transformation | undefined => {
  if (from === to) {
    return equel;
  }

  for (const item of replaceTransformationsMapper) {
    if (item.fromType === from && item.toType === to) {
      return item.transformation;
    }
  }
};

type Transformation = (value: unknown, defaultValue?: unknown) => unknown;
type ReplaceTransformationsMapper = {
  fromType: JsonSchemaTypeName;
  toType: JsonSchemaTypeName;
  transformation: Transformation;
}[];
