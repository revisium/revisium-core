import {
  getArraySchema,
  getNumberSchema,
  getObjectSchema,
  getRefSchema,
  getStringSchema,
} from '@revisium/schema-toolkit/mocks';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { findRefPaths } from 'src/features/sub-schema/utils/find-ref-paths';

const FILE_SCHEMA_ID = SystemSchemaIds.File;

describe('findRefPaths', () => {
  it('should return empty array for schema without refs', () => {
    const schema = getObjectSchema({
      name: getStringSchema(),
      age: getNumberSchema(),
    });

    const result = findRefPaths(schema, FILE_SCHEMA_ID);

    expect(result).toEqual([]);
  });

  it('should find single ref at root level', () => {
    const schema = getObjectSchema({
      file: getRefSchema(FILE_SCHEMA_ID),
    });

    const result = findRefPaths(schema, FILE_SCHEMA_ID);

    expect(result).toEqual([{ path: 'file' }]);
  });

  it('should find multiple refs at root level', () => {
    const schema = getObjectSchema({
      avatar: getRefSchema(FILE_SCHEMA_ID),
      cover: getRefSchema(FILE_SCHEMA_ID),
    });

    const result = findRefPaths(schema, FILE_SCHEMA_ID);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ path: 'avatar' });
    expect(result).toContainEqual({ path: 'cover' });
  });

  it('should find refs in nested objects', () => {
    const schema = getObjectSchema({
      media: getObjectSchema({
        thumbnail: getRefSchema(FILE_SCHEMA_ID),
        fullImage: getRefSchema(FILE_SCHEMA_ID),
      }),
    });

    const result = findRefPaths(schema, FILE_SCHEMA_ID);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ path: 'media.thumbnail' });
    expect(result).toContainEqual({ path: 'media.fullImage' });
  });

  it('should find refs in array items', () => {
    const schema = getObjectSchema({
      images: getArraySchema(getRefSchema(FILE_SCHEMA_ID)),
    });

    const result = findRefPaths(schema, FILE_SCHEMA_ID);

    expect(result).toEqual([{ path: 'images[*]' }]);
  });

  it('should find refs in array of objects', () => {
    const schema = getObjectSchema({
      attachments: getArraySchema(
        getObjectSchema({
          file: getRefSchema(FILE_SCHEMA_ID),
        }),
      ),
    });

    const result = findRefPaths(schema, FILE_SCHEMA_ID);

    expect(result).toEqual([{ path: 'attachments[*].file' }]);
  });

  it('should find refs in deeply nested structure', () => {
    const schema = getObjectSchema({
      content: getObjectSchema({
        sections: getArraySchema(
          getObjectSchema({
            media: getObjectSchema({
              image: getRefSchema(FILE_SCHEMA_ID),
            }),
          }),
        ),
      }),
    });

    const result = findRefPaths(schema, FILE_SCHEMA_ID);

    expect(result).toEqual([{ path: 'content.sections[*].media.image' }]);
  });

  it('should handle complex schema with mixed ref and non-ref fields', () => {
    const schema = getObjectSchema({
      name: getStringSchema(),
      avatar: getRefSchema(FILE_SCHEMA_ID),
      metadata: getObjectSchema({
        title: getStringSchema(),
        icon: getRefSchema(FILE_SCHEMA_ID),
      }),
      gallery: getArraySchema(getRefSchema(FILE_SCHEMA_ID)),
    });

    const result = findRefPaths(schema, FILE_SCHEMA_ID);

    expect(result).toHaveLength(3);
    expect(result).toContainEqual({ path: 'avatar' });
    expect(result).toContainEqual({ path: 'metadata.icon' });
    expect(result).toContainEqual({ path: 'gallery[*]' });
  });

  it('should return empty array when searching for different schemaId', () => {
    const schema = getObjectSchema({
      file: getRefSchema(FILE_SCHEMA_ID),
    });

    const result = findRefPaths(schema, SystemSchemaIds.RowId);

    expect(result).toEqual([]);
  });
});
