import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { FormulaValidationService } from '../formula-validation.service';

describe('FormulaValidationService', () => {
  let service: FormulaValidationService;
  let jsonSchemaStoreService: JsonSchemaStoreService;

  beforeEach(() => {
    jsonSchemaStoreService = new JsonSchemaStoreService();
    service = new FormulaValidationService(jsonSchemaStoreService);
  });

  it('should validate valid formula', () => {
    const schema = {
      type: 'object',
      properties: {
        price: { type: 'number', default: 0 },
        doubled: {
          type: 'number',
          default: 0,
          readOnly: true,
          'x-formula': { version: 1, expression: 'price * 2' },
        },
      },
      additionalProperties: false,
      required: ['price', 'doubled'],
    };

    const result = service.validateSchema(schema);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid formula syntax', () => {
    const schema = {
      type: 'object',
      properties: {
        total: {
          type: 'number',
          default: 0,
          readOnly: true,
          'x-formula': { version: 1, expression: 'price * *' },
        },
      },
      additionalProperties: false,
      required: ['total'],
    };

    const result = service.validateSchema(schema);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.field).toBe('total');
  });

  it('should reject formula referencing non-existent field', () => {
    const schema = {
      type: 'object',
      properties: {
        total: {
          type: 'number',
          default: 0,
          readOnly: true,
          'x-formula': { version: 1, expression: 'nonExistent * 2' },
        },
      },
      additionalProperties: false,
      required: ['total'],
    };

    const result = service.validateSchema(schema);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]?.error).toContain('nonExistent');
  });

  it('should reject circular dependencies', () => {
    const schema = {
      type: 'object',
      properties: {
        a: {
          type: 'number',
          default: 0,
          readOnly: true,
          'x-formula': { version: 1, expression: 'b + 1' },
        },
        b: {
          type: 'number',
          default: 0,
          readOnly: true,
          'x-formula': { version: 1, expression: 'a + 1' },
        },
      },
      additionalProperties: false,
      required: ['a', 'b'],
    };

    const result = service.validateSchema(schema);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]?.error).toContain('Circular');
  });

  it('should allow schema without formulas', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', default: '' },
        price: { type: 'number', default: 0 },
      },
      additionalProperties: false,
      required: ['name', 'price'],
    };

    const result = service.validateSchema(schema);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate formula referencing $ref field properties', () => {
    const schema = {
      type: 'object',
      properties: {
        avatar: { $ref: SystemSchemaIds.File },
        dimensions: {
          type: 'number',
          default: 0,
          readOnly: true,
          'x-formula': {
            version: 1,
            expression: 'avatar.width + avatar.height',
          },
        },
      },
      additionalProperties: false,
      required: ['avatar', 'dimensions'],
    };

    const result = service.validateSchema(schema);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
