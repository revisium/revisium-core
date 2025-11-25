import { Test, TestingModule } from '@nestjs/testing';
import { SchemaImpactService } from '../schema-impact.service';
import { MigrationType, JsonPatchOp, SchemaFieldChangeType } from '../../types';

describe('SchemaImpactService', () => {
  let service: SchemaImpactService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchemaImpactService],
    }).compile();

    service = module.get<SchemaImpactService>(SchemaImpactService);
  });

  describe('analyzeSchemaImpact', () => {
    it('returns null when fromSchemaHash is null', () => {
      const result = service.analyzeSchemaImpact(null, 'schema-hash-2', []);
      expect(result).toBeNull();
    });

    it('returns null when toSchemaHash is null', () => {
      const result = service.analyzeSchemaImpact('schema-hash-1', null, []);
      expect(result).toBeNull();
    });

    it('returns null when schema hashes are the same', () => {
      const result = service.analyzeSchemaImpact(
        'schema-hash-1',
        'schema-hash-1',
        [],
      );
      expect(result).toBeNull();
    });

    it('detects schema change when hashes differ', () => {
      const result = service.analyzeSchemaImpact(
        'schema-hash-1',
        'schema-hash-2',
        [],
      );

      expect(result).not.toBeNull();
      expect(result?.schemaHashChanged).toBe(true);
      expect(result?.migrationApplied).toBe(false);
    });

    it('detects migration applied', () => {
      const migrations = [
        {
          id: 'migration-1',
          changeType: 'init',
          schema: { type: 'object', properties: {} },
        },
      ];

      const result = service.analyzeSchemaImpact(
        'schema-hash-1',
        'schema-hash-2',
        migrations,
      );

      expect(result?.migrationApplied).toBe(true);
    });

    it('extracts init migration details', () => {
      const migrations = [
        {
          id: 'migration-1',
          changeType: 'init',
          schema: { type: 'object', properties: { name: { type: 'string' } } },
        },
      ];

      const result = service.analyzeSchemaImpact(
        'schema-hash-1',
        'schema-hash-2',
        migrations,
      );

      expect(result?.migrationDetails).toBeDefined();
      expect(result?.migrationDetails?.migrationType).toBe(MigrationType.Init);
      expect(result?.migrationDetails?.initialSchema).toEqual(
        migrations[0].schema,
      );
    });

    it('extracts update migration details with patches', () => {
      const migrations = [
        {
          id: 'migration-1',
          changeType: 'update',
          patches: [
            {
              op: 'add',
              path: '/properties/email',
              value: { type: 'string' },
            },
          ],
        },
      ];

      const result = service.analyzeSchemaImpact(
        'schema-hash-1',
        'schema-hash-2',
        migrations,
      );

      expect(result?.migrationDetails).toBeDefined();
      expect(result?.migrationDetails?.migrationType).toBe(
        MigrationType.Update,
      );
      expect(result?.migrationDetails?.patches).toBeDefined();
      expect(result?.migrationDetails?.patches).toHaveLength(1);
      expect(result?.migrationDetails?.patches?.[0].op).toBe(JsonPatchOp.Add);
    });

    it('extracts rename migration details', () => {
      const migrations = [
        {
          id: 'migration-1',
          changeType: 'rename',
          tableId: 'old-table-id',
          nextTableId: 'new-table-id',
        },
      ];

      const result = service.analyzeSchemaImpact(
        'schema-hash-1',
        'schema-hash-2',
        migrations,
      );

      expect(result?.migrationDetails).toBeDefined();
      expect(result?.migrationDetails?.migrationType).toBe(
        MigrationType.Rename,
      );
      expect(result?.migrationDetails?.oldTableId).toBe('old-table-id');
      expect(result?.migrationDetails?.newTableId).toBe('new-table-id');
    });

    it('extracts added fields', () => {
      const migrations = [
        {
          id: 'migration-1',
          changeType: 'update',
          patches: [
            {
              op: 'add',
              path: '/properties/email',
              value: { type: 'string' },
            },
            {
              op: 'add',
              path: '/properties/age',
              value: { type: 'number' },
            },
          ],
        },
      ];

      const result = service.analyzeSchemaImpact(
        'schema-hash-1',
        'schema-hash-2',
        migrations,
      );

      expect(result?.fieldSchemaChanges).toHaveLength(2);
      expect(result?.fieldSchemaChanges[0]).toEqual({
        fieldPath: 'email',
        changeType: SchemaFieldChangeType.Added,
        newSchema: { type: 'string' },
      });
      expect(result?.fieldSchemaChanges[1]).toEqual({
        fieldPath: 'age',
        changeType: SchemaFieldChangeType.Added,
        newSchema: { type: 'number' },
      });
    });

    it('extracts removed fields', () => {
      const migrations = [
        {
          id: 'migration-1',
          changeType: 'update',
          patches: [
            {
              op: 'remove',
              path: '/properties/deprecated',
            },
          ],
        },
      ];

      const result = service.analyzeSchemaImpact(
        'schema-hash-1',
        'schema-hash-2',
        migrations,
      );

      expect(result?.fieldSchemaChanges).toHaveLength(1);
      expect(result?.fieldSchemaChanges[0]).toEqual({
        fieldPath: 'deprecated',
        changeType: SchemaFieldChangeType.Removed,
      });
    });

    it('extracts modified fields', () => {
      const migrations = [
        {
          id: 'migration-1',
          changeType: 'update',
          patches: [
            {
              op: 'replace',
              path: '/properties/name',
              value: { type: 'string', maxLength: 100 },
            },
          ],
        },
      ];

      const result = service.analyzeSchemaImpact(
        'schema-hash-1',
        'schema-hash-2',
        migrations,
      );

      expect(result?.fieldSchemaChanges).toHaveLength(1);
      expect(result?.fieldSchemaChanges[0]).toEqual({
        fieldPath: 'name',
        changeType: SchemaFieldChangeType.Modified,
        newSchema: { type: 'string', maxLength: 100 },
      });
    });

    it('extracts moved fields', () => {
      const migrations = [
        {
          id: 'migration-1',
          changeType: 'update',
          patches: [
            {
              op: 'move',
              from: '/properties/oldName',
              path: '/properties/newName',
            },
          ],
        },
      ];

      const result = service.analyzeSchemaImpact(
        'schema-hash-1',
        'schema-hash-2',
        migrations,
      );

      expect(result?.fieldSchemaChanges).toHaveLength(1);
      expect(result?.fieldSchemaChanges[0]).toEqual({
        fieldPath: 'newName',
        changeType: SchemaFieldChangeType.Moved,
        movedFrom: 'oldName',
        movedTo: 'newName',
      });
    });

    it('extracts affected fields from all operations', () => {
      const migrations = [
        {
          id: 'migration-1',
          changeType: 'update',
          patches: [
            {
              op: 'add',
              path: '/properties/email',
              value: { type: 'string' },
            },
            {
              op: 'remove',
              path: '/properties/deprecated',
            },
            {
              op: 'replace',
              path: '/properties/name',
              value: { type: 'string' },
            },
          ],
        },
      ];

      const result = service.analyzeSchemaImpact(
        'schema-hash-1',
        'schema-hash-2',
        migrations,
      );

      expect(result?.fieldSchemaChanges).toHaveLength(3);
      expect(result?.fieldSchemaChanges.map((c) => c.fieldPath)).toContain(
        'email',
      );
      expect(result?.fieldSchemaChanges.map((c) => c.fieldPath)).toContain(
        'deprecated',
      );
      expect(result?.fieldSchemaChanges.map((c) => c.fieldPath)).toContain(
        'name',
      );
    });

    it('handles multiple migrations', () => {
      const migrations = [
        {
          id: 'migration-1',
          changeType: 'update',
          patches: [
            {
              op: 'add',
              path: '/properties/field1',
              value: { type: 'string' },
            },
          ],
        },
        {
          id: 'migration-2',
          changeType: 'update',
          patches: [
            {
              op: 'add',
              path: '/properties/field2',
              value: { type: 'string' },
            },
          ],
        },
      ];

      const result = service.analyzeSchemaImpact(
        'schema-hash-1',
        'schema-hash-2',
        migrations,
      );

      expect(result?.fieldSchemaChanges).toHaveLength(2);
      expect(result?.fieldSchemaChanges.map((c) => c.fieldPath)).toContain(
        'field1',
      );
      expect(result?.fieldSchemaChanges.map((c) => c.fieldPath)).toContain(
        'field2',
      );
    });

    it('handles empty migrations array', () => {
      const result = service.analyzeSchemaImpact(
        'schema-hash-1',
        'schema-hash-2',
        [],
      );

      expect(result?.migrationApplied).toBe(false);
      expect(result?.fieldSchemaChanges).toEqual([]);
    });

    it('handles remove migration type', () => {
      const migrations = [
        {
          id: 'migration-1',
          changeType: 'remove',
        },
      ];

      const result = service.analyzeSchemaImpact(
        'schema-hash-1',
        'schema-hash-2',
        migrations,
      );

      expect(result?.migrationDetails?.migrationType).toBe(
        MigrationType.Remove,
      );
    });

    it('handles unknown migration type', () => {
      const migrations = [
        {
          id: 'migration-1',
          changeType: 'unknown',
        },
      ];

      const result = service.analyzeSchemaImpact(
        'schema-hash-1',
        'schema-hash-2',
        migrations,
      );

      expect(result?.migrationDetails?.migrationType).toBe(
        MigrationType.Update,
      );
    });

    it('ignores non-property paths', () => {
      const migrations = [
        {
          id: 'migration-1',
          changeType: 'update',
          patches: [
            {
              op: 'add',
              path: '/type',
              value: 'object',
            },
            {
              op: 'add',
              path: '/properties/name',
              value: { type: 'string' },
            },
          ],
        },
      ];

      const result = service.analyzeSchemaImpact(
        'schema-hash-1',
        'schema-hash-2',
        migrations,
      );

      expect(result?.fieldSchemaChanges).toHaveLength(1);
      expect(result?.fieldSchemaChanges[0].fieldPath).toBe('name');
      expect(result?.fieldSchemaChanges.map((c) => c.fieldPath)).not.toContain(
        'type',
      );
    });

    it('handles copy operation', () => {
      const migrations = [
        {
          id: 'migration-1',
          changeType: 'update',
          patches: [
            {
              op: 'copy',
              from: '/properties/source',
              path: '/properties/destination',
            },
          ],
        },
      ];

      const result = service.analyzeSchemaImpact(
        'schema-hash-1',
        'schema-hash-2',
        migrations,
      );

      expect(result?.migrationDetails?.patches?.[0].op).toBe(JsonPatchOp.Copy);
    });
  });
});
