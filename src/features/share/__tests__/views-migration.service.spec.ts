import { Test, TestingModule } from '@nestjs/testing';
import {
  JsonPatch,
  JsonSchemaTypeName,
  JsonObjectSchema,
} from '@revisium/schema-toolkit/types';
import {
  ViewsMigrationService,
  ViewsMigrationError,
} from '../views-migration.service';
import { TableViewsData, View } from 'src/features/views/types';

describe('ViewsMigrationService', () => {
  let service: ViewsMigrationService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ViewsMigrationService],
    }).compile();

    service = module.get<ViewsMigrationService>(ViewsMigrationService);
  });

  const createBaseSchema = (): JsonObjectSchema => ({
    type: JsonSchemaTypeName.Object,
    required: ['name', 'age', 'email'],
    properties: {
      name: { type: JsonSchemaTypeName.String, default: '' },
      age: { type: JsonSchemaTypeName.Number, default: 0 },
      email: { type: JsonSchemaTypeName.String, default: '' },
    },
    additionalProperties: false,
  });

  const createViewsData = (views: View[]): TableViewsData => ({
    version: 1,
    defaultViewId: 'default',
    views,
  });

  const createView = (overrides: Partial<View> = {}): View => ({
    id: 'view1',
    name: 'View 1',
    ...overrides,
  });

  const renamePatch = (from: string, to: string): JsonPatch[] => [
    { op: 'move', from: `/${from}`, path: `/${to}` },
  ];

  const removePatch = (field: string): JsonPatch[] => [
    { op: 'remove', path: `/${field}` },
  ];

  const replacePatch = (
    field: string,
    type: JsonSchemaTypeName,
  ): JsonPatch[] => {
    const defaultValue =
      type === JsonSchemaTypeName.String
        ? ''
        : type === JsonSchemaTypeName.Boolean
          ? false
          : 0;
    return [
      {
        op: 'replace',
        path: `/${field}`,
        value: { type, default: defaultValue },
      } as JsonPatch,
    ];
  };

  const migrate = (views: View[], patches: JsonPatch[]): TableViewsData =>
    service.migrateViews({
      viewsData: createViewsData(views),
      patches,
      previousSchema: createBaseSchema(),
    });

  describe('move patch - rename field', () => {
    it('should rename field in columns', () => {
      const result = migrate(
        [
          createView({
            columns: [
              { field: 'data.name', width: 100 },
              { field: 'data.age', width: 50 },
            ],
          }),
        ],
        renamePatch('name', 'fullName'),
      );

      expect(result.views[0].columns).toEqual([
        { field: 'data.fullName', width: 100 },
        { field: 'data.age', width: 50 },
      ]);
    });

    it('should rename field in sorts', () => {
      const result = migrate(
        [
          createView({
            sorts: [
              { field: 'data.name', direction: 'asc' },
              { field: 'data.age', direction: 'desc' },
            ],
          }),
        ],
        renamePatch('name', 'fullName'),
      );

      expect(result.views[0].sorts).toEqual([
        { field: 'data.fullName', direction: 'asc' },
        { field: 'data.age', direction: 'desc' },
      ]);
    });

    it('should rename field in filters conditions', () => {
      const result = migrate(
        [
          createView({
            filters: {
              logic: 'and',
              conditions: [
                { field: 'data.name', operator: 'contains', value: 'John' },
                { field: 'data.age', operator: 'gt', value: 18 },
              ],
            },
          }),
        ],
        renamePatch('name', 'fullName'),
      );

      expect(result.views[0].filters?.conditions).toEqual([
        { field: 'data.fullName', operator: 'contains', value: 'John' },
        { field: 'data.age', operator: 'gt', value: 18 },
      ]);
    });

    it('should rename field in nested filter groups', () => {
      const result = migrate(
        [
          createView({
            filters: {
              logic: 'and',
              conditions: [{ field: 'data.age', operator: 'gt', value: 18 }],
              groups: [
                {
                  logic: 'or',
                  conditions: [
                    { field: 'data.name', operator: 'contains', value: 'John' },
                    { field: 'data.name', operator: 'contains', value: 'Jane' },
                  ],
                  groups: [
                    {
                      logic: 'and',
                      conditions: [
                        {
                          field: 'data.name',
                          operator: 'startsWith',
                          value: 'Dr.',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          }),
        ],
        renamePatch('name', 'fullName'),
      );

      expect(result.views[0].filters?.conditions).toEqual([
        { field: 'data.age', operator: 'gt', value: 18 },
      ]);
      expect(result.views[0].filters?.groups?.[0].conditions).toEqual([
        { field: 'data.fullName', operator: 'contains', value: 'John' },
        { field: 'data.fullName', operator: 'contains', value: 'Jane' },
      ]);
      expect(
        result.views[0].filters?.groups?.[0].groups?.[0].conditions,
      ).toEqual([
        { field: 'data.fullName', operator: 'startsWith', value: 'Dr.' },
      ]);
    });

    it('should rename field across multiple views', () => {
      const result = migrate(
        [
          createView({ columns: [{ field: 'data.name', width: 100 }] }),
          createView({
            id: 'view2',
            name: 'View 2',
            columns: [{ field: 'data.name', width: 200 }],
            sorts: [{ field: 'data.name', direction: 'desc' }],
          }),
        ],
        renamePatch('name', 'fullName'),
      );

      expect(result.views[0].columns).toEqual([
        { field: 'data.fullName', width: 100 },
      ]);
      expect(result.views[1].columns).toEqual([
        { field: 'data.fullName', width: 200 },
      ]);
      expect(result.views[1].sorts).toEqual([
        { field: 'data.fullName', direction: 'desc' },
      ]);
    });
  });

  describe('remove patch - remove field', () => {
    it('should remove field from columns', () => {
      const result = migrate(
        [
          createView({
            columns: [
              { field: 'data.name', width: 100 },
              { field: 'data.age', width: 50 },
              { field: 'data.email', width: 150 },
            ],
          }),
        ],
        removePatch('name'),
      );

      expect(result.views[0].columns).toEqual([
        { field: 'data.age', width: 50 },
        { field: 'data.email', width: 150 },
      ]);
    });

    it('should remove field from sorts', () => {
      const result = migrate(
        [
          createView({
            sorts: [
              { field: 'data.name', direction: 'asc' },
              { field: 'data.age', direction: 'desc' },
            ],
          }),
        ],
        removePatch('name'),
      );

      expect(result.views[0].sorts).toEqual([
        { field: 'data.age', direction: 'desc' },
      ]);
    });

    it('should remove field from filters conditions', () => {
      const result = migrate(
        [
          createView({
            filters: {
              logic: 'and',
              conditions: [
                { field: 'data.name', operator: 'contains', value: 'John' },
                { field: 'data.age', operator: 'gt', value: 18 },
              ],
            },
          }),
        ],
        removePatch('name'),
      );

      expect(result.views[0].filters?.conditions).toEqual([
        { field: 'data.age', operator: 'gt', value: 18 },
      ]);
    });

    it('should remove field from nested filter groups', () => {
      const result = migrate(
        [
          createView({
            filters: {
              logic: 'and',
              conditions: [{ field: 'data.age', operator: 'gt', value: 18 }],
              groups: [
                {
                  logic: 'or',
                  conditions: [
                    { field: 'data.name', operator: 'contains', value: 'John' },
                    { field: 'data.email', operator: 'contains', value: '@' },
                  ],
                },
              ],
            },
          }),
        ],
        removePatch('name'),
      );

      expect(result.views[0].filters?.groups?.[0].conditions).toEqual([
        { field: 'data.email', operator: 'contains', value: '@' },
      ]);
    });

    it('should remove empty nested filter groups after field removal', () => {
      const result = migrate(
        [
          createView({
            filters: {
              logic: 'and',
              conditions: [{ field: 'data.age', operator: 'gt', value: 18 }],
              groups: [
                {
                  logic: 'or',
                  conditions: [
                    { field: 'data.name', operator: 'contains', value: 'John' },
                  ],
                },
              ],
            },
          }),
        ],
        removePatch('name'),
      );

      expect(result.views[0].filters?.groups).toEqual([]);
    });

    it('should handle removing all columns', () => {
      const result = migrate(
        [createView({ columns: [{ field: 'data.name', width: 100 }] })],
        removePatch('name'),
      );

      expect(result.views[0].columns).toEqual([]);
    });

    it('should handle removing all sorts', () => {
      const result = migrate(
        [createView({ sorts: [{ field: 'data.name', direction: 'asc' }] })],
        removePatch('name'),
      );

      expect(result.views[0].sorts).toEqual([]);
    });
  });

  describe('replace patch - type change', () => {
    it('should remove filters when type changes from string to number', () => {
      const result = migrate(
        [
          createView({
            columns: [{ field: 'data.name', width: 100 }],
            sorts: [{ field: 'data.name', direction: 'asc' }],
            filters: {
              logic: 'and',
              conditions: [
                { field: 'data.name', operator: 'contains', value: 'John' },
                { field: 'data.age', operator: 'gt', value: 18 },
              ],
            },
          }),
        ],
        replacePatch('name', JsonSchemaTypeName.Number),
      );

      expect(result.views[0].columns).toEqual([
        { field: 'data.name', width: 100 },
      ]);
      expect(result.views[0].sorts).toEqual([
        { field: 'data.name', direction: 'asc' },
      ]);
      expect(result.views[0].filters?.conditions).toEqual([
        { field: 'data.age', operator: 'gt', value: 18 },
      ]);
    });

    it('should keep filters when type does not change', () => {
      const result = migrate(
        [
          createView({
            filters: {
              logic: 'and',
              conditions: [
                { field: 'data.name', operator: 'contains', value: 'John' },
              ],
            },
          }),
        ],
        replacePatch('name', JsonSchemaTypeName.String),
      );

      expect(result.views[0].filters?.conditions).toEqual([
        { field: 'data.name', operator: 'contains', value: 'John' },
      ]);
    });

    it('should remove filters from nested groups when type changes', () => {
      const result = migrate(
        [
          createView({
            filters: {
              logic: 'and',
              conditions: [{ field: 'data.age', operator: 'gt', value: 18 }],
              groups: [
                {
                  logic: 'or',
                  conditions: [
                    { field: 'data.name', operator: 'contains', value: 'John' },
                    { field: 'data.email', operator: 'contains', value: '@' },
                  ],
                },
              ],
            },
          }),
        ],
        replacePatch('name', JsonSchemaTypeName.Boolean),
      );

      expect(result.views[0].filters?.conditions).toEqual([
        { field: 'data.age', operator: 'gt', value: 18 },
      ]);
      expect(result.views[0].filters?.groups?.[0].conditions).toEqual([
        { field: 'data.email', operator: 'contains', value: '@' },
      ]);
    });
  });

  describe('add patch', () => {
    it('should not modify views when adding new field', () => {
      const view = createView({
        columns: [{ field: 'data.name', width: 100 }],
        sorts: [{ field: 'data.name', direction: 'asc' }],
        filters: {
          logic: 'and',
          conditions: [
            { field: 'data.name', operator: 'contains', value: 'John' },
          ],
        },
      });

      const result = migrate(
        [view],
        [
          {
            op: 'add',
            path: '/phone',
            value: { type: JsonSchemaTypeName.String, default: '' },
          },
        ],
      );

      expect(result.views[0].columns).toEqual(view.columns);
      expect(result.views[0].sorts).toEqual(view.sorts);
      expect(result.views[0].filters?.conditions).toEqual(
        view.filters?.conditions,
      );
    });
  });

  describe('multiple patches', () => {
    it('should apply multiple patches in sequence', () => {
      const result = migrate(
        [
          createView({
            columns: [
              { field: 'data.name', width: 100 },
              { field: 'data.age', width: 50 },
              { field: 'data.email', width: 150 },
            ],
            sorts: [{ field: 'data.name', direction: 'asc' }],
          }),
        ],
        [...renamePatch('name', 'fullName'), ...removePatch('age')],
      );

      expect(result.views[0].columns).toEqual([
        { field: 'data.fullName', width: 100 },
        { field: 'data.email', width: 150 },
      ]);
      expect(result.views[0].sorts).toEqual([
        { field: 'data.fullName', direction: 'asc' },
      ]);
    });

    it('should handle rename followed by type change', () => {
      const result = migrate(
        [
          createView({
            columns: [{ field: 'data.name', width: 100 }],
            filters: {
              logic: 'and',
              conditions: [
                { field: 'data.name', operator: 'contains', value: 'John' },
              ],
            },
          }),
        ],
        [
          ...renamePatch('name', 'identifier'),
          {
            op: 'replace',
            path: '/identifier',
            value: { type: JsonSchemaTypeName.Number, default: 0 },
          },
        ],
      );

      expect(result.views[0].columns).toEqual([
        { field: 'data.identifier', width: 100 },
      ]);
      expect(result.views[0].filters?.conditions).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle views with null columns', () => {
      const result = migrate(
        [createView({ columns: null })],
        removePatch('name'),
      );

      expect(result.views[0].columns).toBeNull();
    });

    it('should handle views with undefined sorts', () => {
      const result = migrate([createView()], removePatch('name'));

      expect(result.views[0].sorts).toBeUndefined();
    });

    it('should handle views with undefined filters', () => {
      const result = migrate([createView()], removePatch('name'));

      expect(result.views[0].filters).toBeUndefined();
    });

    it('should handle empty views array', () => {
      const result = migrate([], removePatch('name'));

      expect(result.views).toEqual([]);
    });

    it('should handle empty patches array', () => {
      const result = migrate(
        [createView({ columns: [{ field: 'data.name', width: 100 }] })],
        [],
      );

      expect(result.views[0].columns).toEqual([
        { field: 'data.name', width: 100 },
      ]);
    });

    it('should not mutate original viewsData', () => {
      const viewsData = createViewsData([
        createView({ columns: [{ field: 'data.name', width: 100 }] }),
      ]);
      const originalColumns = [...viewsData.views[0].columns!];

      service.migrateViews({
        viewsData,
        patches: renamePatch('name', 'fullName'),
        previousSchema: createBaseSchema(),
      });

      expect(viewsData.views[0].columns).toEqual(originalColumns);
    });

    it('should handle field not referenced in views', () => {
      const result = migrate(
        [createView({ columns: [{ field: 'data.age', width: 50 }] })],
        removePatch('email'),
      );

      expect(result.views[0].columns).toEqual([
        { field: 'data.age', width: 50 },
      ]);
    });

    it('should preserve other view properties', () => {
      const result = migrate(
        [
          createView({
            description: 'Test description',
            search: 'test search',
            columns: [{ field: 'data.name', width: 100 }],
          }),
        ],
        renamePatch('name', 'fullName'),
      );

      expect(result.views[0].id).toBe('view1');
      expect(result.views[0].name).toBe('View 1');
      expect(result.views[0].description).toBe('Test description');
      expect(result.views[0].search).toBe('test search');
    });

    it('should preserve viewsData metadata', () => {
      const viewsData: TableViewsData = {
        version: 1,
        defaultViewId: 'custom-default',
        views: [createView()],
      };

      const result = service.migrateViews({
        viewsData,
        patches: removePatch('name'),
        previousSchema: createBaseSchema(),
      });

      expect(result.version).toBe(1);
      expect(result.defaultViewId).toBe('custom-default');
    });
  });

  describe('deeply nested filter groups', () => {
    it('should handle three levels of nested filter groups', () => {
      const result = migrate(
        [
          createView({
            filters: {
              logic: 'and',
              groups: [
                {
                  logic: 'or',
                  groups: [
                    {
                      logic: 'and',
                      conditions: [
                        {
                          field: 'data.name',
                          operator: 'contains',
                          value: 'John',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          }),
        ],
        renamePatch('name', 'fullName'),
      );

      expect(
        result.views[0].filters?.groups?.[0].groups?.[0].conditions,
      ).toEqual([
        { field: 'data.fullName', operator: 'contains', value: 'John' },
      ]);
    });

    it('should remove deeply nested empty groups', () => {
      const result = migrate(
        [
          createView({
            filters: {
              logic: 'and',
              conditions: [{ field: 'data.age', operator: 'gt', value: 18 }],
              groups: [
                {
                  logic: 'or',
                  groups: [
                    {
                      logic: 'and',
                      conditions: [
                        {
                          field: 'data.name',
                          operator: 'contains',
                          value: 'John',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          }),
        ],
        removePatch('name'),
      );

      expect(result.views[0].filters?.conditions).toEqual([
        { field: 'data.age', operator: 'gt', value: 18 },
      ]);
      expect(result.views[0].filters?.groups).toEqual([]);
    });
  });

  describe('ViewsMigrationError', () => {
    const invalidPatch = [
      { op: 'move', path: '/name' },
    ] as unknown as JsonPatch[];
    const testContext = { revisionId: 'rev-123', tableId: 'test-table' };

    const migrateWithInvalidPatch = (context?: typeof testContext) =>
      service.migrateViews(
        {
          viewsData: createViewsData([
            createView({ columns: [{ field: 'data.name', width: 100 }] }),
          ]),
          patches: invalidPatch,
          previousSchema: createBaseSchema(),
        },
        context,
      );

    it('should throw ViewsMigrationError with context when patch fails', () => {
      expect(() => migrateWithInvalidPatch(testContext)).toThrow(
        ViewsMigrationError,
      );
    });

    it('should include patch operation and path in error details', () => {
      try {
        migrateWithInvalidPatch(testContext);
        fail('Expected ViewsMigrationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ViewsMigrationError);
        const migrationError = error as ViewsMigrationError;
        expect(migrationError.context.revisionId).toBe('rev-123');
        expect(migrationError.context.tableId).toBe('test-table');
        expect(migrationError.details.patchOp).toBe('move');
        expect(migrationError.details.patchPath).toBe('/name');
      }
    });

    it('should include original error in details when available', () => {
      try {
        migrateWithInvalidPatch(testContext);
        fail('Expected ViewsMigrationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ViewsMigrationError);
        const migrationError = error as ViewsMigrationError;
        expect(migrationError.details.originalError).toBeDefined();
      }
    });

    it('should throw regular error when no context is provided', () => {
      expect(() => migrateWithInvalidPatch()).toThrow();

      try {
        migrateWithInvalidPatch();
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).not.toBeInstanceOf(ViewsMigrationError);
      }
    });

    it('should have proper error name and message', () => {
      const context = { revisionId: 'revision-abc', tableId: 'users-table' };

      try {
        migrateWithInvalidPatch(context);
        fail('Expected ViewsMigrationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ViewsMigrationError);
        const migrationError = error as ViewsMigrationError;
        expect(migrationError.name).toBe('ViewsMigrationError');
        expect(migrationError.message).toContain('move');
        expect(migrationError.message).toContain('/name');
        expect(migrationError.message).toContain('users-table');
      }
    });
  });
});
