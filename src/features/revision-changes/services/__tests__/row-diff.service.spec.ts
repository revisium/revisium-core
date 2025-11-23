import { Test, TestingModule } from '@nestjs/testing';
import { RowDiffService } from '../row-diff.service';
import { RowChangeDetailType } from '../../types';

describe('RowDiffService', () => {
  let service: RowDiffService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RowDiffService],
    }).compile();

    service = module.get<RowDiffService>(RowDiffService);
  });

  describe('analyzeFieldChanges', () => {
    it('returns empty array when both data are null', () => {
      const result = service.analyzeFieldChanges(null, null);
      expect(result).toEqual([]);
    });

    it('detects entire object as added when fromData is null', () => {
      const toData = { name: 'John', age: 30 };
      const result = service.analyzeFieldChanges(null, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        fieldPath: '',
        oldValue: null,
        newValue: toData,
        changeType: RowChangeDetailType.FieldAdded,
      });
    });

    it('detects entire object as removed when toData is null', () => {
      const fromData = { name: 'John', age: 30 };
      const result = service.analyzeFieldChanges(fromData, null);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        fieldPath: '',
        oldValue: fromData,
        newValue: null,
        changeType: RowChangeDetailType.FieldRemoved,
      });
    });

    it('detects field modifications', () => {
      const fromData = { name: 'John', age: 30 };
      const toData = { name: 'Jane', age: 30 };
      const result = service.analyzeFieldChanges(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        fieldPath: 'name',
        oldValue: 'John',
        newValue: 'Jane',
        changeType: RowChangeDetailType.FieldModified,
      });
    });

    it('detects field additions in existing data', () => {
      const fromData = { name: 'John' };
      const toData = { name: 'John', age: 30 };
      const result = service.analyzeFieldChanges(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        fieldPath: 'age',
        oldValue: null,
        newValue: 30,
        changeType: RowChangeDetailType.FieldAdded,
      });
    });

    it('detects field removals in existing data', () => {
      const fromData = { name: 'John', age: 30 };
      const toData = { name: 'John' };
      const result = service.analyzeFieldChanges(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        fieldPath: 'age',
        oldValue: 30,
        newValue: null,
        changeType: RowChangeDetailType.FieldRemoved,
      });
    });

    it('handles nested objects', () => {
      const fromData = { user: { name: 'John', age: 30 } };
      const toData = { user: { name: 'Jane', age: 30 } };
      const result = service.analyzeFieldChanges(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0].fieldPath).toContain('name');
      expect(result[0].oldValue).toBe('John');
      expect(result[0].newValue).toBe('Jane');
    });

    it('detects schema migration changes when schema hash differs', () => {
      const fromData = { name: 'John' };
      const toData = { name: 'John', age: 30 };
      const result = service.analyzeFieldChanges(
        fromData,
        toData,
        'schema-hash-1',
        'schema-hash-2',
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        fieldPath: 'age',
        oldValue: null,
        newValue: 30,
        changeType: RowChangeDetailType.SchemaMigration,
      });
    });

    it('handles complex nested objects', () => {
      const fromData = {
        user: {
          profile: {
            name: 'John',
            email: 'john@example.com',
          },
        },
      };
      const toData = {
        user: {
          profile: {
            name: 'Jane',
            email: 'john@example.com',
          },
        },
      };
      const result = service.analyzeFieldChanges(fromData, toData);

      expect(result.length).toBeGreaterThan(0);
      const nameChange = result.find((c) => c.newValue === 'Jane');
      expect(nameChange).toBeDefined();
      expect(nameChange?.changeType).toBe(RowChangeDetailType.FieldModified);
    });

    it('handles array values', () => {
      const fromData = { tags: ['a', 'b'] };
      const toData = { tags: ['a', 'b', 'c'] };
      const result = service.analyzeFieldChanges(fromData, toData);

      expect(result.length).toBeGreaterThan(0);
    });

    it('returns empty array when no changes', () => {
      const fromData = { name: 'John', age: 30 };
      const toData = { name: 'John', age: 30 };
      const result = service.analyzeFieldChanges(fromData, toData);

      expect(result).toEqual([]);
    });

    it('handles multiple field changes', () => {
      const fromData = { name: 'John', age: 30, city: 'NY' };
      const toData = { name: 'Jane', age: 31, city: 'LA' };
      const result = service.analyzeFieldChanges(fromData, toData);

      expect(result).toHaveLength(3);
      expect(
        result.every((r) => r.changeType === RowChangeDetailType.FieldModified),
      ).toBe(true);
    });

    it('handles boolean values', () => {
      const fromData = { active: true };
      const toData = { active: false };
      const result = service.analyzeFieldChanges(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        fieldPath: 'active',
        oldValue: true,
        newValue: false,
        changeType: RowChangeDetailType.FieldModified,
      });
    });

    it('handles null to value changes', () => {
      const fromData = { name: null };
      const toData = { name: 'John' };
      const result = service.analyzeFieldChanges(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        fieldPath: 'name',
        oldValue: null,
        newValue: 'John',
      });
    });

    it('handles value to null changes', () => {
      const fromData = { name: 'John' };
      const toData = { name: null };
      const result = service.analyzeFieldChanges(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        fieldPath: 'name',
        oldValue: 'John',
        newValue: null,
      });
    });
  });
});
