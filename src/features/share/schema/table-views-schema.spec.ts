import Ajv from 'ajv/dist/2020';
import { tableViewsSchema } from 'src/features/share/schema/table-views-schema';

describe('table-views-schema', () => {
  const ajv = new Ajv();

  it('validates minimal views data', () => {
    const validMinimal = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default' }],
    };

    const valid = ajv.validate(tableViewsSchema, validMinimal);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
  });

  it('validates views with all optional fields', () => {
    const validFull = {
      version: 1,
      defaultViewId: 'published',
      views: [
        {
          id: 'default',
          name: 'Default',
          description: 'Default view',
          columns: [
            { field: 'id', width: 150 },
            { field: 'data.title', width: 300 },
          ],
          filters: {
            logic: 'and',
            conditions: [
              { field: 'data.status', operator: 'equals', value: 'active' },
            ],
            groups: [
              {
                logic: 'or',
                conditions: [
                  { field: 'data.type', operator: 'equals', value: 'post' },
                  { field: 'data.type', operator: 'equals', value: 'article' },
                ],
              },
            ],
          },
          sorts: [{ field: 'data.createdAt', direction: 'desc' }],
          search: 'test query',
        },
        {
          id: 'published',
          name: 'Published Only',
        },
      ],
    };

    const valid = ajv.validate(tableViewsSchema, validFull);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
  });

  it('validates views with null columns', () => {
    const validNullColumns = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default', columns: null }],
    };

    const valid = ajv.validate(tableViewsSchema, validNullColumns);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
  });

  it('validates views with empty columns array', () => {
    const validEmptyColumns = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default', columns: [] }],
    };

    const valid = ajv.validate(tableViewsSchema, validEmptyColumns);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
  });

  it('validates column without width', () => {
    const validColumnNoWidth = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          columns: [{ field: 'id' }],
        },
      ],
    };

    const valid = ajv.validate(tableViewsSchema, validColumnNoWidth);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
  });

  it('validates all filter operators', () => {
    const operators = [
      'equals',
      'not_equals',
      'contains',
      'not_contains',
      'starts_with',
      'ends_with',
      'is_empty',
      'is_not_empty',
      'gt',
      'gte',
      'lt',
      'lte',
      'is_true',
      'is_false',
    ];

    for (const operator of operators) {
      const validData = {
        version: 1,
        defaultViewId: 'default',
        views: [
          {
            id: 'default',
            name: 'Default',
            filters: {
              logic: 'and',
              conditions: [{ field: 'data.test', operator, value: 'test' }],
            },
          },
        ],
      };

      const valid = ajv.validate(tableViewsSchema, validData);
      expect(ajv.errors).toBeNull();
      expect(valid).toBe(true);
    }
  });

  it('validates filter condition without value', () => {
    const validNoValue = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          filters: {
            logic: 'and',
            conditions: [{ field: 'data.test', operator: 'is_empty' }],
          },
        },
      ],
    };

    const valid = ajv.validate(tableViewsSchema, validNoValue);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
  });

  it('rejects invalid version type', () => {
    const invalid = {
      version: 'not-a-number',
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default' }],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects version less than 1', () => {
    const invalid = {
      version: 0,
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default' }],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects view with empty id', () => {
    const invalid = {
      version: 1,
      defaultViewId: '',
      views: [{ id: '', name: 'Default' }],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects view with empty name', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default', name: '' }],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects view name exceeding max length', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'a'.repeat(101) }],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects view description exceeding max length', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default', description: 'a'.repeat(501) }],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects column with empty field', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          columns: [{ field: '' }],
        },
      ],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects column width less than minimum', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          columns: [{ field: 'id', width: 10 }],
        },
      ],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects invalid sort direction', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          sorts: [{ field: 'id', direction: 'invalid' }],
        },
      ],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects invalid filter logic', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          filters: {
            logic: 'invalid',
            conditions: [],
          },
        },
      ],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects invalid filter operator', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          filters: {
            logic: 'and',
            conditions: [{ field: 'id', operator: 'invalid_operator' }],
          },
        },
      ],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects filter condition with empty field', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          filters: {
            logic: 'and',
            conditions: [{ field: '', operator: 'equals' }],
          },
        },
      ],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects sort with empty field', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          sorts: [{ field: '', direction: 'asc' }],
        },
      ],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects missing required version field', () => {
    const invalid = {
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default' }],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects missing required views field', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects view missing required id', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [{ name: 'Default' }],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects view missing required name', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default' }],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects additional properties in root', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default' }],
      extra: 'property',
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects additional properties in view', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default', extra: 'property' }],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects additional properties in column', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          columns: [{ field: 'id', extra: 'property' }],
        },
      ],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects additional properties in filter group', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          filters: {
            logic: 'and',
            conditions: [],
            extra: 'property',
          },
        },
      ],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects additional properties in filter condition', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          filters: {
            logic: 'and',
            conditions: [
              { field: 'id', operator: 'equals', value: 'test', extra: 'prop' },
            ],
          },
        },
      ],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });

  it('rejects additional properties in sort', () => {
    const invalid = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          sorts: [{ field: 'id', direction: 'asc', extra: 'property' }],
        },
      ],
    };

    const valid = ajv.validate(tableViewsSchema, invalid);
    expect(valid).toBe(false);
    expect(ajv.errors).not.toBeNull();
  });
});
