import {
  convertRawSubSchemaItems,
  SubSchemaRawItem,
} from '../get-sub-schema-items-sql';

describe('convertRawSubSchemaItems', () => {
  const createRawItem = (
    overrides: Partial<SubSchemaRawItem> = {},
  ): SubSchemaRawItem => ({
    tableId: 'table-1',
    rowId: 'row-1',
    rowVersionId: 'row-version-1',
    fieldPath: 'file',
    row_versionId: 'row-version-1',
    row_createdId: 'row-created-1',
    row_id: 'row-1',
    row_readonly: false,
    row_createdAt: new Date('2024-01-01'),
    row_updatedAt: new Date('2024-01-01'),
    row_publishedAt: null as unknown as Date,
    row_data: { file: { fileId: 'f1', url: '' } },
    row_meta: {},
    row_hash: 'hash-1',
    row_schemaHash: 'schema-hash-1',
    table_versionId: 'table-version-1',
    table_createdId: 'table-created-1',
    table_id: 'table-1',
    table_readonly: false,
    table_createdAt: new Date('2024-01-01'),
    table_updatedAt: new Date('2024-01-01'),
    table_system: false,
    ...overrides,
  });

  it('should convert raw items to parsed items', () => {
    const rawItems = [createRawItem()];

    const result = convertRawSubSchemaItems(rawItems);

    expect(result).toHaveLength(1);
    expect(result[0].tableId).toBe('table-1');
    expect(result[0].rowId).toBe('row-1');
    expect(result[0].fieldPath).toBe('file');
    expect(result[0].row.id).toBe('row-1');
    expect(result[0].table.id).toBe('table-1');
  });

  it('should reuse same Row object for items with same rowVersionId', () => {
    const rawItems = [
      createRawItem({ fieldPath: 'icon' }),
      createRawItem({ fieldPath: 'images[0]' }),
      createRawItem({ fieldPath: 'images[1]' }),
    ];

    const result = convertRawSubSchemaItems(rawItems);

    expect(result).toHaveLength(3);
    expect(result[0].row).toBe(result[1].row);
    expect(result[1].row).toBe(result[2].row);
  });

  it('should reuse same Table object for items with same tableVersionId', () => {
    const rawItems = [
      createRawItem({ rowVersionId: 'rv-1', row_versionId: 'rv-1' }),
      createRawItem({ rowVersionId: 'rv-2', row_versionId: 'rv-2' }),
    ];

    const result = convertRawSubSchemaItems(rawItems);

    expect(result).toHaveLength(2);
    expect(result[0].table).toBe(result[1].table);
  });

  it('should create different Row objects for different rowVersionId', () => {
    const rawItems = [
      createRawItem({
        rowId: 'row-1',
        rowVersionId: 'rv-1',
        row_versionId: 'rv-1',
        row_id: 'row-1',
      }),
      createRawItem({
        rowId: 'row-2',
        rowVersionId: 'rv-2',
        row_versionId: 'rv-2',
        row_id: 'row-2',
      }),
    ];

    const result = convertRawSubSchemaItems(rawItems);

    expect(result).toHaveLength(2);
    expect(result[0].row).not.toBe(result[1].row);
    expect(result[0].row.id).toBe('row-1');
    expect(result[1].row.id).toBe('row-2');
  });

  it('should create different Table objects for different tableVersionId', () => {
    const rawItems = [
      createRawItem({
        tableId: 'table-1',
        table_versionId: 'tv-1',
        table_id: 'table-1',
      }),
      createRawItem({
        tableId: 'table-2',
        table_versionId: 'tv-2',
        table_id: 'table-2',
      }),
    ];

    const result = convertRawSubSchemaItems(rawItems);

    expect(result).toHaveLength(2);
    expect(result[0].table).not.toBe(result[1].table);
  });

  it('should allow mutation of shared row.data to affect all items', () => {
    const rawItems = [
      createRawItem({ fieldPath: 'file1' }),
      createRawItem({ fieldPath: 'file2' }),
    ];

    const result = convertRawSubSchemaItems(rawItems);

    (result[0].row.data as Record<string, unknown>).url = 'http://example.com';

    expect((result[1].row.data as Record<string, unknown>).url).toBe(
      'http://example.com',
    );
  });
});
