import { JsonArrayValueStore } from 'src/features/share/utils/schema/model/value/json-array-value.store';
import { JsonObjectValueStore } from 'src/features/share/utils/schema/model/value/json-object-value.store';
import { JsonValueStore } from 'src/features/share/utils/schema/model/value/json-value.store';

export const getJsonValueStoreByPath = (
  root: JsonValueStore,
  path: string,
): JsonValueStore => {
  if (!path) {
    return root;
  }

  const segments = getSegments(path);

  let current: JsonValueStore | undefined = root;

  for (const seg of segments) {
    if (current instanceof JsonObjectValueStore) {
      current = current.value[String(seg)];
    } else if (current instanceof JsonArrayValueStore) {
      if (typeof seg !== 'number') {
        throw new Error(`Invalid array index "${seg}"`);
      }
      current = current.value[seg];
    } else {
      throw new Error(`Cannot navigate into primitive at segment "${seg}"`);
    }

    if (!current) {
      throw new Error(`Path not found at segment "${seg}"`);
    }
  }

  if (!current) {
    throw new Error('Unknown value for path');
  }

  return current;
};

const regex = /([^.[\]]+)|\[(\d+)]/g;

const getSegments = (path: string) => {
  const segments: (string | number)[] = [];

  let match: RegExpExecArray | null;

  while ((match = regex.exec(path))) {
    if (match[1] !== undefined) {
      segments.push(match[1]);
    } else if (match[2] !== undefined) {
      segments.push(Number(match[2]));
    }
  }

  return segments;
};
