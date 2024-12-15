import {
  getAddPatch,
  getArraySchema,
  getBooleanSchema,
  getMovePatch,
  getNumberSchema,
  getObjectSchema,
  getRemovePatch,
  getReplacePatch,
  getStringSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { SchemaTable } from 'src/share/utils/schema/lib/schema-table';
import { JsonPatch } from 'src/share/utils/schema/types/json-patch.types';
import {
  JsonSchema,
  JsonSchemaPrimitives,
} from 'src/share/utils/schema/types/schema.types';

describe('applyPatches', () => {
  describe('replace', () => {
    it('replace root', () => {
      const schema = getObjectSchema({
        fieldString: getStringSchema(),
      });

      const replaceRootPatchString = getReplacePatch({
        path: '',
        value: getStringSchema(),
      });
      const replaceRootPatchNumber = getReplacePatch({
        path: '',
        value: getNumberSchema(),
      });

      expect(
        applyPatches(schema, [replaceRootPatchString, replaceRootPatchNumber]),
      ).toStrictEqual(replaceRootPatchNumber.value);

      expect(
        applyPatches(schema, [replaceRootPatchNumber, replaceRootPatchString]),
      ).toStrictEqual(replaceRootPatchString.value);
    });

    it('replace nested object', () => {
      const replaceNestedPatchObject = getReplacePatch({
        path: '/properties/nested/properties/value',
        value: getObjectSchema({
          sub: getStringSchema(),
        }),
      });

      const schema = getObjectSchema({
        fieldString: getStringSchema(),
        fieldArray: getArraySchema(getNumberSchema()),
        nested: getObjectSchema({ value: getNumberSchema() }),
      });

      const expectedSchema = getObjectSchema({
        fieldString: getStringSchema(),
        fieldArray: getArraySchema(getNumberSchema()),
        nested: getObjectSchema({ value: replaceNestedPatchObject.value }),
      });

      expect(applyPatches(schema, [replaceNestedPatchObject])).toStrictEqual(
        expectedSchema,
      );
    });

    it('replace nested array items with primitive', () => {
      const replaceNestedPatchString = getReplacePatch({
        path: '/properties/nested/properties/fieldArray/items',
        value: getStringSchema(),
      });

      const schema = getObjectSchema({
        fieldString: getStringSchema(),
        nested: getObjectSchema({
          fieldArray: getArraySchema(getNumberSchema()),
        }),
      });

      const expectedSchema = getObjectSchema({
        fieldString: getStringSchema(),
        nested: getObjectSchema({
          fieldArray: getArraySchema(
            replaceNestedPatchString.value as JsonSchemaPrimitives,
          ),
        }),
      });

      expect(applyPatches(schema, [replaceNestedPatchString])).toStrictEqual(
        expectedSchema,
      );
    });

    it('replace nested array items', () => {
      const replaceNestedPatchString = getReplacePatch({
        path: '/properties/nested/properties/fieldArray/items',
        value: getObjectSchema({}),
      });

      const schema = getObjectSchema({
        fieldString: getStringSchema(),
        nested: getObjectSchema({
          fieldArray: getArraySchema(getNumberSchema()),
        }),
      });

      const expectedSchema = getObjectSchema({
        fieldString: getStringSchema(),
        nested: getObjectSchema({
          fieldArray: getArraySchema(getObjectSchema({})),
        }),
      });

      expect(applyPatches(schema, [replaceNestedPatchString])).toStrictEqual(
        expectedSchema,
      );
    });

    it('replace items / items', () => {
      const replaceNestedPatchString = getReplacePatch({
        path: '/properties/fieldArray/items/items',
        value: getObjectSchema({}),
      });

      const schema = getObjectSchema({
        fieldArray: getArraySchema(getArraySchema(getNumberSchema())),
      });

      const expectedSchema = getObjectSchema({
        fieldArray: getArraySchema(getArraySchema(getObjectSchema({}))),
      });

      expect(applyPatches(schema, [replaceNestedPatchString])).toStrictEqual(
        expectedSchema,
      );
    });

    it('replace items / items / properties / field', () => {
      const replaceNestedPatchString = getReplacePatch({
        path: '/properties/fieldArray/items/items/properties/field',
        value: getStringSchema(),
      });

      const schema = getObjectSchema({
        fieldArray: getArraySchema(
          getArraySchema(getObjectSchema({ field: getNumberSchema() })),
        ),
      });

      const expectedSchema = getObjectSchema({
        fieldArray: getArraySchema(
          getArraySchema(getObjectSchema({ field: getStringSchema() })),
        ),
      });

      expect(applyPatches(schema, [replaceNestedPatchString])).toStrictEqual(
        expectedSchema,
      );
    });

    describe('values migration', () => {
      describe('special cases', () => {
        it('moving a field between parents of an object in an array', () => {
          const schemaTable = new SchemaTable(
            getArraySchema(
              getObjectSchema({
                parent: getObjectSchema({
                  field: getStringSchema(),
                }),
              }),
            ),
          );

          schemaTable.addRow('row-1', [
            { parent: { field: '1' } },
            { parent: { field: '2' } },
          ]);

          schemaTable.applyPatches([
            getMovePatch({
              from: '/items/properties/parent/properties/field',
              path: '/items/properties/field',
            }),
          ]);

          expect(schemaTable.getRow('row-1')).toEqual([
            { parent: {}, field: '1' },
            { parent: {}, field: '2' },
          ]);
        });

        it('moving a complex field between parents of an object in an array', () => {
          const schemaTable = new SchemaTable(
            getArraySchema(
              getObjectSchema({
                parent: getObjectSchema({
                  field: getObjectSchema({
                    str: getStringSchema(),
                    num: getNumberSchema(),
                  }),
                }),
              }),
            ),
          );

          schemaTable.addRow('row-1', [
            { parent: { field: { str: '1', num: 1 } } },
            { parent: { field: { str: '2', num: 2 } } },
          ]);

          schemaTable.addRow('row-2', [
            { parent: { field: { str: '3', num: 3 } } },
            { parent: { field: { str: '4', num: 4 } } },
            { parent: { field: { str: '5', num: 5 } } },
          ]);

          schemaTable.applyPatches([
            getMovePatch({
              from: '/items/properties/parent/properties/field',
              path: '/items/properties/field',
            }),
          ]);

          expect(schemaTable.getRow('row-1')).toEqual([
            { parent: {}, field: { str: '1', num: 1 } },
            { parent: {}, field: { str: '2', num: 2 } },
          ]);
          expect(schemaTable.getRow('row-2')).toEqual([
            { parent: {}, field: { str: '3', num: 3 } },
            { parent: {}, field: { str: '4', num: 4 } },
            { parent: {}, field: { str: '5', num: 5 } },
          ]);
        });

        it('moving a field from the parent object in the array to parent object', () => {
          const schemaTable = new SchemaTable(
            getObjectSchema({
              array: getArraySchema(
                getObjectSchema({
                  field: getStringSchema(),
                }),
              ),
            }),
          );

          schemaTable.addRow('row-1', {
            array: [{ field: '1' }, { field: '2' }],
          });

          schemaTable.applyPatches([
            getMovePatch({
              from: '/properties/array/items/properties/field',
              path: '/properties/field',
            }),
          ]);

          expect(schemaTable.getRow('row-1')).toEqual({
            field: '1',
            array: [{}, {}],
          });
        });

        it('moving a field from the parent object in the array to parent array', () => {
          const schemaTable = new SchemaTable(
            getObjectSchema({
              array: getArraySchema(
                getObjectSchema({
                  nestedArray: getArraySchema(
                    getObjectSchema({
                      field: getStringSchema(),
                    }),
                  ),
                }),
              ),
            }),
          );

          schemaTable.addRow('row-1', {
            array: [
              { nestedArray: [{ field: '1' }, { field: '2' }, { field: '3' }] },
              { nestedArray: [{ field: '4' }, { field: '4' }] },
            ],
          });

          schemaTable.applyPatches([
            getMovePatch({
              from: '/properties/array/items/properties/nestedArray/items/properties/field',
              path: '/properties/array/items/properties/field',
            }),
          ]);

          expect(schemaTable.getRow('row-1')).toEqual({
            array: [
              {
                field: '1',
                nestedArray: [{}, {}, {}],
              },
              { field: '2', nestedArray: [{}, {}] },
            ],
          });
        });

        xit('moving a complex field from object in an array to nested array', () => {
          // TODO need to optimize migration
          const schemaTable = new SchemaTable(
            getArraySchema(
              getObjectSchema({
                parent: getObjectSchema({
                  str: getStringSchema(),
                  num: getNumberSchema(),
                }),
                nestedArray: getArraySchema(
                  getObjectSchema({
                    nestedStr: getStringSchema(),
                  }),
                ),
              }),
            ),
          );

          schemaTable.addRow('row-1', [
            {
              parent: { str: '1', num: 1 },
              nestedArray: [
                { nestedStr: 'nested-1' },
                { nestedStr: 'nested-2' },
                { nestedStr: 'nested-3' },
              ],
            },
            {
              parent: { str: '2', num: 2 },
              nestedArray: [
                { nestedStr: 'nested-4' },
                { nestedStr: 'nested-5' },
              ],
            },
          ]);

          schemaTable.addRow('row-2', [
            {
              parent: { str: '3', num: 3 },
              nestedArray: [
                { nestedStr: 'nested-6' },
                { nestedStr: 'nested-7' },
                { nestedStr: 'nested-8' },
                { nestedStr: 'nested-9' },
              ],
            },
            {
              parent: { str: '4', num: 4 },
              nestedArray: [{ nestedStr: 'nested-10' }],
            },
            { parent: { str: '5', num: 5 }, nestedArray: [] },
          ]);

          schemaTable.applyPatches([
            getMovePatch({
              from: '/items/properties/parent',
              path: '/items/properties/nestedArray/items/properties/movedParent',
            }),
          ]);

          expect(schemaTable.getRow('row-1')).toEqual([
            {
              nestedArray: [
                {
                  movedParent: {
                    num: 1,
                    str: '1',
                  },
                  nestedStr: 'nested-1',
                },
                {
                  movedParent: {
                    num: 1,
                    str: '1',
                  },
                  nestedStr: 'nested-2',
                },
                {
                  movedParent: {
                    num: 1,
                    str: '1',
                  },
                  nestedStr: 'nested-3',
                },
              ],
            },
            {
              nestedArray: [
                {
                  movedParent: {
                    num: 2,
                    str: '2',
                  },
                  nestedStr: 'nested-4',
                },
                {
                  movedParent: {
                    num: 2,
                    str: '2',
                  },
                  nestedStr: 'nested-5',
                },
              ],
            },
          ]);
          expect(schemaTable.getRow('row-2')).toEqual([
            {
              nestedArray: [
                {
                  movedParent: {
                    num: 3,
                    str: '3',
                  },
                  nestedStr: 'nested-6',
                },
                {
                  movedParent: {
                    num: 3,
                    str: '3',
                  },
                  nestedStr: 'nested-7',
                },
                {
                  movedParent: {
                    num: 3,
                    str: '3',
                  },
                  nestedStr: 'nested-8',
                },
                {
                  movedParent: {
                    num: 3,
                    str: '3',
                  },
                  nestedStr: 'nested-9',
                },
              ],
            },
            {
              nestedArray: [
                {
                  movedParent: {
                    num: 4,
                    str: '4',
                  },
                  nestedStr: 'nested-10',
                },
              ],
            },
            {
              nestedArray: [],
            },
          ]);
        });
      });

      it.each([
        [getNumberSchema(), getStringSchema(), 12, '12'],
        [getNumberSchema(), getBooleanSchema(), 12, true],
        //
        [getStringSchema(), getNumberSchema(), '12gg', 12],
        [getStringSchema(), getBooleanSchema(), 'false', false],
        //
        [getBooleanSchema(), getStringSchema(), true, 'true'],
        [getBooleanSchema(), getNumberSchema(), true, 1],
        //
        [getStringSchema(), getArraySchema(getStringSchema()), '123', ['123']],
        [
          getArraySchema(getStringSchema()),
          getStringSchema(),
          ['123', '321'],
          '123',
        ],
        //
        [getNumberSchema(), getArraySchema(getNumberSchema()), 123, [123]],
        [getArraySchema(getNumberSchema()), getNumberSchema(), [123, 321], 123],
        //
        [getBooleanSchema(), getArraySchema(getBooleanSchema()), true, [true]],
        [
          getArraySchema(getBooleanSchema()),
          getBooleanSchema(),
          [true, false],
          true,
        ],
        //
        [getNumberSchema(), getArraySchema(getStringSchema()), 123, ['123']],
        [getNumberSchema(), getArraySchema(getBooleanSchema()), 123, [true]],
        [
          getArraySchema(getNumberSchema()),
          getStringSchema(),
          [123, 321],
          '123',
        ],
        [
          getArraySchema(getNumberSchema()),
          getBooleanSchema(),
          [123, 321],
          true,
        ],
        //
        [getStringSchema(), getArraySchema(getNumberSchema()), '123fg', [123]],
        [
          getStringSchema(),
          getArraySchema(getBooleanSchema()),
          'false',
          [false],
        ],
        [
          getArraySchema(getStringSchema()),
          getNumberSchema(),
          ['123', '321'],
          123,
        ],
        [
          getArraySchema(getStringSchema()),
          getBooleanSchema(),
          ['123', '321'],
          true,
        ],
        //
        [getBooleanSchema(), getArraySchema(getNumberSchema()), true, [1]],
        [getBooleanSchema(), getArraySchema(getStringSchema()), true, ['true']],
        [
          getArraySchema(getBooleanSchema()),
          getNumberSchema(),
          [true, false],
          1,
        ],
        [
          getArraySchema(getBooleanSchema()),
          getStringSchema(),
          [true, false],
          'true',
        ],
      ])(
        'root replacing - %#',
        (beforeSchema, afterSchema, beforeValue, nextValue) => {
          const schemaTable = new SchemaTable(beforeSchema);

          schemaTable.addRow('row-1', beforeValue);

          schemaTable.applyPatches([
            getReplacePatch({
              path: '',
              value: afterSchema,
            }),
          ]);

          expect(schemaTable.getRow('row-1')).toEqual(nextValue);
        },
      );

      it('from number to string in object', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getNumberSchema(),
          }),
        );

        schemaTable.addRow('row-1', {
          field: 100,
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: getStringSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: '100',
        });
      });

      it('from number to string in array', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getArraySchema(getNumberSchema()),
          }),
        );

        schemaTable.addRow('row-1', {
          field: [1, 2, 3],
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field/items',
            value: getStringSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: ['1', '2', '3'],
        });
      });

      it('from string to number in object', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getStringSchema(),
          }),
        );

        schemaTable.addRow('row-1', {
          field: '100',
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: getNumberSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: 100,
        });
      });

      it('from string to number in array', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getArraySchema(getStringSchema()),
          }),
        );

        schemaTable.addRow('row-1', {
          field: ['1', '2', '3', 'value', '', '1123213123ggdfg0'],
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field/items',
            value: getNumberSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: [1, 2, 3, 0, 0, 1123213123],
        });
      });

      it('from boolean to string in object', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getBooleanSchema(),
          }),
        );

        schemaTable.addRow('row-1', {
          field: true,
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: getStringSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: 'true',
        });
      });

      it('from boolean to string in array', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getArraySchema(getBooleanSchema()),
          }),
        );

        schemaTable.addRow('row-1', {
          field: [true, false, true],
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field/items',
            value: getStringSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: ['true', 'false', 'true'],
        });
      });

      it('from string to boolean in object', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getStringSchema(),
          }),
        );

        schemaTable.addRow('row-1', {
          field: 'False',
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: getBooleanSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: false,
        });
      });

      it('from string to boolean in array', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getArraySchema(getStringSchema()),
          }),
        );

        schemaTable.addRow('row-1', {
          field: ['true', 'false', 'False', '', '0', '1'],
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field/items',
            value: getBooleanSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: [true, false, false, false, true, true],
        });
      });

      it('from boolean to number in object', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getBooleanSchema(),
          }),
        );

        schemaTable.addRow('row-1', {
          field: true,
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: getNumberSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: 1,
        });
      });

      it('from boolean to number in array', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getArraySchema(getBooleanSchema()),
          }),
        );

        schemaTable.addRow('row-1', {
          field: [true, false, true, false, true],
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field/items',
            value: getNumberSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: [1, 0, 1, 0, 1],
        });
      });

      it('from number to boolean in object', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getNumberSchema(),
          }),
        );

        schemaTable.addRow('row-1', {
          field: 1,
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: getBooleanSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: true,
        });
      });

      it('from number to boolean in array', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getArraySchema(getNumberSchema()),
          }),
        );

        schemaTable.addRow('row-1', {
          field: [1, 123, 0, 0.01, 12],
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field/items',
            value: getBooleanSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: [true, true, false, true, true],
        });
      });
    });
  });

  describe('remove', () => {
    it('remove from nested object', () => {
      const removeNestedPatchObject = getRemovePatch({
        path: '/properties/nested/properties/value',
      });

      const schema = getObjectSchema({
        fieldString: getStringSchema(),
        fieldArray: getArraySchema(getNumberSchema()),
        nested: getObjectSchema({ value: getNumberSchema() }),
      });

      const expectedSchema = getObjectSchema({
        fieldString: getStringSchema(),
        fieldArray: getArraySchema(getNumberSchema()),
        nested: getObjectSchema({}),
      });

      expect(applyPatches(schema, [removeNestedPatchObject])).toStrictEqual(
        expectedSchema,
      );
    });

    it('remove from nested array', () => {
      const removeNestedPatchArray = getRemovePatch({
        path: '/properties/fieldArray/items',
      });

      const schema = getObjectSchema({
        fieldArray: getArraySchema(getNumberSchema()),
      });

      expect(() => applyPatches(schema, [removeNestedPatchArray])).toThrow(
        'Cannot remove from non-object',
      );
    });

    it('remove from items / items', () => {
      const removeNestedPatchArray = getRemovePatch({
        path: '/properties/fieldArray/items/items',
      });

      const schema = getObjectSchema({
        fieldArray: getArraySchema(getArraySchema(getNumberSchema())),
      });

      expect(() => applyPatches(schema, [removeNestedPatchArray])).toThrow(
        'Cannot remove from non-object',
      );
    });

    it('remove from items / items / properties', () => {
      const removeNestedPatchArray = getRemovePatch({
        path: '/properties/fieldArray/items/items/properties/field',
      });

      const schema = getObjectSchema({
        fieldArray: getArraySchema(
          getArraySchema(getObjectSchema({ field: getNumberSchema() })),
        ),
      });

      const expectedSchema = getObjectSchema({
        fieldArray: getArraySchema(getArraySchema(getObjectSchema({}))),
      });

      expect(applyPatches(schema, [removeNestedPatchArray])).toStrictEqual(
        expectedSchema,
      );
    });

    it('remove from root', () => {
      const removeNestedPatchArray = getRemovePatch({
        path: '',
      });

      const schema = getObjectSchema({
        fieldArray: getArraySchema(getNumberSchema()),
      });

      expect(() => applyPatches(schema, [removeNestedPatchArray])).toThrow(
        'Parent does not exist',
      );
    });
  });

  describe('add', () => {
    it('invalid path', () => {
      const addNestedPatchField = getAddPatch({
        path: '',
        value: getObjectSchema({ subSubField: getStringSchema() }),
      });

      const schema = getObjectSchema({
        field: getObjectSchema({ subField: getNumberSchema() }),
      });

      expect(() => applyPatches(schema, [addNestedPatchField])).toThrow(
        'Invalid path',
      );
    });

    it('invalid type of parent', () => {
      const addNestedPatchField = getAddPatch({
        path: '/properties/field2',
        value: getObjectSchema({ subSubField: getStringSchema() }),
      });

      const schema = getArraySchema(getNumberSchema());

      expect(() => applyPatches(schema, [addNestedPatchField])).toThrow(
        'Cannot add to non-object',
      );
    });

    it('field already exist', () => {
      const addNestedPatchField = getAddPatch({
        path: '/properties/field/properties/subField',
        value: getObjectSchema({ subSubField: getStringSchema() }),
      });

      const schema = getObjectSchema({
        field: getObjectSchema({ subField: getNumberSchema() }),
      });

      expect(() => applyPatches(schema, [addNestedPatchField])).toThrow(
        'Field "subField" already exists in parent',
      );
    });

    it('add to object', () => {
      const addNestedPatchField = getAddPatch({
        path: '/properties/field2',
        value: getObjectSchema({ subSubField: getStringSchema() }),
      });

      const schema = getObjectSchema({
        field: getObjectSchema({
          subField: getNumberSchema(),
        }),
      });

      const expectedSchema = getObjectSchema({
        field: getObjectSchema({
          subField: getNumberSchema(),
        }),
        field2: addNestedPatchField.value,
      });

      expect(applyPatches(schema, [addNestedPatchField])).toEqual(
        expectedSchema,
      );
    });

    it('add to nested object', () => {
      const addNestedPatchField = getAddPatch({
        path: '/properties/field/properties/subField2',
        value: getObjectSchema({ subSubField: getBooleanSchema() }),
      });

      const schema = getObjectSchema({
        field: getObjectSchema({
          subField: getNumberSchema(),
        }),
      });

      const expectedSchema = getObjectSchema({
        field: getObjectSchema({
          subField: getNumberSchema(),
          subField2: addNestedPatchField.value,
        }),
      });

      expect(applyPatches(schema, [addNestedPatchField])).toEqual(
        expectedSchema,
      );
    });

    it('add to items / items / object', () => {
      const addNestedPatchField = getAddPatch({
        path: '/properties/field/items/items/properties/subField2',
        value: getObjectSchema({ subSubField: getBooleanSchema() }),
      });

      const schema = getObjectSchema({
        field: getArraySchema(
          getArraySchema(getObjectSchema({ subField: getNumberSchema() })),
        ),
      });

      const expectedSchema = getObjectSchema({
        field: getArraySchema(
          getArraySchema(
            getObjectSchema({
              subField: getNumberSchema(),
              subField2: addNestedPatchField.value,
            }),
          ),
        ),
      });

      expect(applyPatches(schema, [addNestedPatchField])).toEqual(
        expectedSchema,
      );
    });

    it('add to items / properties / items / properties', () => {
      const addNestedPatchField = getAddPatch({
        path: '/items/properties/field/items/properties/subField2',
        value: getObjectSchema({ subSubField: getBooleanSchema() }),
      });

      const schema = getArraySchema(
        getObjectSchema({
          field: getArraySchema(
            getObjectSchema({
              subField: getStringSchema(),
            }),
          ),
        }),
      );

      const expectedSchema = getArraySchema(
        getObjectSchema({
          field: getArraySchema(
            getObjectSchema({
              subField: getStringSchema(),
              subField2: addNestedPatchField.value,
            }),
          ),
        }),
      );

      expect(applyPatches(schema, [addNestedPatchField])).toEqual(
        expectedSchema,
      );
    });
  });

  describe('move', () => {
    it('invalid from parent', () => {
      const movePatch = getMovePatch({
        from: '/properties/field2/properties/field',
        path: '/properties/field3',
      });

      const schema = getObjectSchema({
        field: getObjectSchema({ subField: getNumberSchema() }),
      });

      expect(() => applyPatches(schema, [movePatch])).toThrow(
        'Not found "field2" in "/properties"',
      );
    });

    it('invalid to parent', () => {
      const movePatch = getMovePatch({
        from: '/properties/field/properties/subField',
        path: '/properties/field2/properties/subField',
      });

      const schema = getObjectSchema({
        field: getObjectSchema({ subField: getNumberSchema() }),
      });

      expect(() => applyPatches(schema, [movePatch])).toThrow(
        'Not found "field2" in "/properties"',
      );
    });

    it('Invalid type of "from" parent', () => {
      const movePatch = getMovePatch({
        from: '/properties/field/properties/subField',
        path: '/properties/field2',
      });

      const schema = getObjectSchema({
        field: getArraySchema(getNumberSchema()),
      });

      expect(() => applyPatches(schema, [movePatch])).toThrow(
        'Cannot move from non-object parent',
      );
    });

    it('Invalid type of "to" parent', () => {
      const movePatch = getMovePatch({
        from: '/properties/field/properties/subField',
        path: '/properties/fieldString/field',
      });

      const schema = getObjectSchema({
        field: getArraySchema(getNumberSchema()),
        fieldString: getStringSchema(),
      });

      expect(() => applyPatches(schema, [movePatch])).toThrow('Invalid path');
    });

    it('move and replace in object', () => {
      const movePatch = getMovePatch({
        from: '/properties/field2',
        path: '/properties/field/properties/subField',
      });

      const moveField = getArraySchema(getStringSchema());

      const schema = getObjectSchema({
        field: getObjectSchema({ subField: getStringSchema() }),
        field2: moveField,
      });

      const expectedSchema = getObjectSchema({
        field: getObjectSchema({ subField: moveField }),
      });

      expect(applyPatches(schema, [movePatch])).toEqual(expectedSchema);
    });

    it('move and add in object', () => {
      const movePatch = getMovePatch({
        from: '/properties/field2',
        path: '/properties/field/properties/subField2',
      });

      const moveField = getArraySchema(getStringSchema());

      const schema = getObjectSchema({
        field: getObjectSchema({ subField: getStringSchema() }),
        field2: moveField,
      });

      const expectedSchema = getObjectSchema({
        field: getObjectSchema({
          subField: getStringSchema(),
          subField2: moveField,
        }),
      });

      expect(applyPatches(schema, [movePatch])).toEqual(expectedSchema);
    });

    it('move and replace items in array', () => {
      const movePatch = getMovePatch({
        from: '/properties/field2',
        path: '/properties/field/properties/subArrayField/items',
      });

      const moveField = getArraySchema(getNumberSchema());

      const schema = getObjectSchema({
        field: getObjectSchema({
          subArrayField: getArraySchema(getStringSchema()),
        }),
        field2: moveField,
      });

      const expectedSchema = getObjectSchema({
        field: getObjectSchema({
          subArrayField: getArraySchema(moveField),
        }),
      });

      expect(applyPatches(schema, [movePatch])).toEqual(expectedSchema);
    });

    it('move and replace items in items / items', () => {
      const movePatch = getMovePatch({
        from: '/properties/field2',
        path: '/properties/field/items/items',
      });

      const moveField = getArraySchema(getNumberSchema());

      const schema = getObjectSchema({
        field: getArraySchema(getArraySchema(getStringSchema())),
        field2: moveField,
      });

      const expectedSchema = getObjectSchema({
        field: getArraySchema(getArraySchema(moveField)),
      });

      expect(applyPatches(schema, [movePatch])).toEqual(expectedSchema);
    });

    it('move from properties / items / items / properties to properties', () => {
      const movePatch = getMovePatch({
        from: '/properties/field/items/items/properties/field',
        path: '/properties/field2',
      });

      const moveField = getArraySchema(getNumberSchema());

      const schema = getObjectSchema({
        field: getArraySchema(
          getArraySchema(getObjectSchema({ field: moveField })),
        ),
      });

      const expectedSchema = getObjectSchema({
        field: getArraySchema(getArraySchema(getObjectSchema({}))),
        field2: moveField,
      });

      expect(applyPatches(schema, [movePatch])).toEqual(expectedSchema);
    });

    describe('values migration', () => {
      it('same parent', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getObjectSchema({
              subArrayField: getArraySchema(getStringSchema()),
            }),
          }),
        );

        schemaTable.addRow('row-1', {
          field: {
            subArrayField: ['1', '2', '3'],
          },
        });

        schemaTable.applyPatches([
          getMovePatch({
            from: '/properties/field',
            path: '/properties/field2',
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field2: {
            subArrayField: ['1', '2', '3'],
          },
        });
      });

      it('same parent and replace', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getObjectSchema({
              subArrayField: getArraySchema(getStringSchema()),
            }),
            field2: getNumberSchema(),
          }),
        );

        schemaTable.addRow('row-1', {
          field: {
            subArrayField: ['1', '2', '3'],
          },
          field2: 10,
        });

        schemaTable.applyPatches([
          getMovePatch({
            from: '/properties/field',
            path: '/properties/field2',
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field2: {
            subArrayField: ['1', '2', '3'],
          },
        });
      });

      it('different parents', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            parent1: getObjectSchema({
              nested: getStringSchema(),
              forReplace: getArraySchema(getNumberSchema()),
            }),
            parent2: getObjectSchema({
              willBeReplaced: getBooleanSchema(),
            }),
          }),
        );

        schemaTable.addRow('row-1', {
          parent1: {
            nested: 'value',
            forReplace: [1, 2, 3],
          },
          parent2: {
            willBeReplaced: 'willBeReplaced',
          },
        });

        schemaTable.applyPatches([
          getMovePatch({
            from: '/properties/parent1/properties/nested',
            path: '/properties/parent2/properties/nested2',
          }),
          getMovePatch({
            from: '/properties/parent1/properties/forReplace',
            path: '/properties/parent2/properties/willBeReplaced',
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          parent1: {},
          parent2: {
            nested2: 'value',
            willBeReplaced: [1, 2, 3],
          },
        });
      });

      it('to array items', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            parent1: getArraySchema(getStringSchema()),
            parent2: getObjectSchema({
              field: getStringSchema(),
            }),
          }),
        );

        schemaTable.addRow('row-1', {
          parent1: ['1', '2', '3', '4', '5'],
          parent2: {
            field: 'field',
          },
        });

        schemaTable.applyPatches([
          getMovePatch({
            from: '/properties/parent2',
            path: '/properties/parent1/items',
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          parent1: [
            {
              field: 'field',
            },
            {
              field: 'field',
            },
            {
              field: 'field',
            },
            {
              field: 'field',
            },
            {
              field: 'field',
            },
          ],
        });
      });
    });
  });

  describe('wrap primitives by array', () => {
    it.each([
      [
        getStringSchema(),
        getArraySchema(getStringSchema()),
        'value',
        ['value'],
      ],
      [getStringSchema(), getArraySchema(getNumberSchema()), '100fg', [100]],
      [getStringSchema(), getArraySchema(getBooleanSchema()), 'false', [false]],
      [getNumberSchema(), getArraySchema(getNumberSchema()), 123, [123]],
      [getNumberSchema(), getArraySchema(getStringSchema()), 123, ['123']],
      [getNumberSchema(), getArraySchema(getBooleanSchema()), 123, [true]],
      [getBooleanSchema(), getArraySchema(getStringSchema()), true, ['true']],
      [getBooleanSchema(), getArraySchema(getNumberSchema()), true, [1]],
    ])(
      'wrap primitives by array %#',
      (primitiveSchema, arraySchema, value, arrayValue) => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: primitiveSchema,
          }),
        );

        schemaTable.addRow('row-1', {
          field: value,
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: arraySchema,
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: arrayValue,
        });
      },
    );
  });

  describe('unwrap primitives from array', () => {
    it.each([
      [
        getStringSchema(),
        getArraySchema(getStringSchema()),
        'value',
        ['value'],
      ],
      [getStringSchema(), getArraySchema(getNumberSchema()), '100', [100, 200]],
      [
        getStringSchema(),
        getArraySchema(getBooleanSchema()),
        'false',
        [false, true],
      ],
      [
        getNumberSchema(),
        getArraySchema(getNumberSchema()),
        123,
        [123, 223, 312],
      ],
      [getNumberSchema(), getArraySchema(getStringSchema()), 123, ['123', '1']],
      [getNumberSchema(), getArraySchema(getBooleanSchema()), 1, [true, false]],
      [
        getBooleanSchema(),
        getArraySchema(getStringSchema()),
        true,
        ['string', 'true'],
      ],
      [getBooleanSchema(), getArraySchema(getNumberSchema()), true, [1]],
      [getStringSchema(), getArraySchema(getStringSchema()), '', []],
      [getNumberSchema(), getArraySchema(getNumberSchema()), 0, []],
      [getBooleanSchema(), getArraySchema(getBooleanSchema()), false, []],
    ])(
      'unwrap primitives from array %#',
      (primitiveSchema, arraySchema, value, arrayValue) => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: arraySchema,
          }),
        );

        schemaTable.addRow('row-1', {
          field: arrayValue,
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: primitiveSchema,
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: value,
        });
      },
    );
  });

  describe('sequence', () => {
    it('sequence', () => {
      const schema = getObjectSchema({
        field: getObjectSchema({
          subArrayField: getArraySchema(getStringSchema()),
        }),
        test2: getObjectSchema({}),
        test: getStringSchema(),
        numField: getNumberSchema(),
        booleanField: getBooleanSchema(),
      });

      const expectedSchema = getObjectSchema({
        field2: getObjectSchema({
          subObject: getObjectSchema({
            numField2: getNumberSchema(),
            booleanField2: getBooleanSchema(),
          }),
          subArrayField: getArraySchema(getStringSchema()),
        }),
        test: getNumberSchema(),
      });

      expect(
        applyPatches(schema, [
          getRemovePatch({
            path: '/properties/test2',
          }),
          getAddPatch({
            path: '/properties/field/properties/subObject',
            value: getObjectSchema({}),
          }),
          getReplacePatch({
            path: '/properties/test',
            value: getNumberSchema(),
          }),
          getMovePatch({
            from: '/properties/numField',
            path: '/properties/field/properties/subObject/properties/numField2',
          }),
          getMovePatch({
            from: '/properties/booleanField',
            path: '/properties/field/properties/subObject/properties/booleanField2',
          }),
          getMovePatch({
            from: '/properties/field',
            path: '/properties/field2',
          }),
        ]),
      ).toEqual(expectedSchema);
    });
  });
});

const applyPatches = (schema: JsonSchema, patches: JsonPatch[]): JsonSchema => {
  const schemaTable = new SchemaTable(schema);
  schemaTable.applyPatches(patches);
  return schemaTable.getSchema();
};
