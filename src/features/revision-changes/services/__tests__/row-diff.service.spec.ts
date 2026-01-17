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
    it('maps FieldChangeType.Added to RowChangeDetailType.FieldAdded', () => {
      const result = service.analyzeFieldChanges(null, { name: 'John' });

      expect(result).toHaveLength(1);
      expect(result[0].changeType).toBe(RowChangeDetailType.FieldAdded);
    });

    it('maps FieldChangeType.Removed to RowChangeDetailType.FieldRemoved', () => {
      const result = service.analyzeFieldChanges({ name: 'John' }, null);

      expect(result).toHaveLength(1);
      expect(result[0].changeType).toBe(RowChangeDetailType.FieldRemoved);
    });

    it('maps FieldChangeType.Modified to RowChangeDetailType.FieldModified', () => {
      const result = service.analyzeFieldChanges(
        { name: 'John' },
        { name: 'Jane' },
      );

      expect(result).toHaveLength(1);
      expect(result[0].changeType).toBe(RowChangeDetailType.FieldModified);
    });

    it('maps path to fieldPath', () => {
      const result = service.analyzeFieldChanges(
        { user: { name: 'John' } },
        { user: { name: 'Jane' } },
      );

      expect(result).toHaveLength(1);
      expect(result[0].fieldPath).toBe('user.name');
    });

    it('maps oldValue and newValue', () => {
      const result = service.analyzeFieldChanges({ value: 1 }, { value: 2 });

      expect(result).toHaveLength(1);
      expect(result[0].oldValue).toBe(1);
      expect(result[0].newValue).toBe(2);
    });

    it('returns empty array when no changes', () => {
      const result = service.analyzeFieldChanges(
        { name: 'John' },
        { name: 'John' },
      );

      expect(result).toEqual([]);
    });
  });
});
