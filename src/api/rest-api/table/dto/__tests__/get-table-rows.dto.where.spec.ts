import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GetTableRowsDto } from '../get-table-rows.dto';

describe('GetTableRowsDto where', () => {
  it('should allow filtering by versionId', async () => {
    const errors = await getErrors({
      where: { versionId: { equals: 'v1' } },
    });
    expect(errors).toHaveLength(0);
  });

  it('should allow filtering by createdId', async () => {
    const errors = await getErrors({
      where: { createdId: { equals: 'c1' } },
    });
    expect(errors).toHaveLength(0);
  });

  it('should allow filtering by id', async () => {
    const errors = await getErrors({
      where: { id: { equals: 'row1' } },
    });
    expect(errors).toHaveLength(0);
  });

  it('should allow filtering by readonly', async () => {
    const errors = await getErrors({
      where: { readonly: { equals: true } },
    });
    expect(errors).toHaveLength(0);
  });

  it('should allow filtering by createdAt, updatedAt and publishedAt', async () => {
    const errors = await getErrors({
      where: {
        createdAt: { equals: '2025-05-25T12:00:00Z' },
        updatedAt: { equals: '2025-05-25T13:00:00Z' },
        publishedAt: { equals: '2025-05-25T13:00:00Z' },
      },
    });
    expect(errors).toHaveLength(0);
  });

  it('should allow filtering by data and meta JSON', async () => {
    const errors = await getErrors({
      where: {
        data: { equals: { foo: 'bar' } },
        meta: { equals: [1, 2, 3] },
      },
    });
    expect(errors).toHaveLength(0);
  });

  it('should allow filtering by hash and schemaHash', async () => {
    const errors = await getErrors({
      where: {
        hash: { equals: 'h1' },
        schemaHash: { equals: 'sh1' },
      },
    });
    expect(errors).toHaveLength(0);
  });

  it('should allow combining AND/OR/NOT arrays', async () => {
    const errors = await getErrors({
      where: {
        AND: [{ id: { equals: 'a' } }, { readonly: { equals: false } }],
        OR: [{ id: { equals: 'b' } }, { readonly: { equals: true } }],
        NOT: [{ versionId: { equals: 'v' } }],
      },
    });
    expect(errors).toHaveLength(0);
  });

  it('missing where should pass', async () => {
    const errors = await getErrors({});
    expect(errors).toHaveLength(0);
  });
});

const make = (input: Partial<GetTableRowsDto>) =>
  plainToInstance(GetTableRowsDto, { first: 1, ...input });

const getErrors = async (input: Partial<GetTableRowsDto>) =>
  validate(make(input));
