import {
  getArraySchema,
  getObjectSchema,
  getStringSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import { replaceForeignKeyValue } from 'src/features/share/utils/schema/lib/replaceForeignKeyValue';
import { JsonValueStore } from 'src/features/share/utils/schema/model/value/json-value.store';

const createTestValue = (schema: any, value: any): JsonValueStore => {
  return createJsonValueStore(
    createJsonSchemaStore(schema),
    'testRowId',
    value,
  );
};

describe('replaceForeignKeyValue', () => {
  describe('simple string values', () => {
    it('should update string value with matching foreignKey', () => {
      const schema = getStringSchema({ foreignKey: 'tableId' });
      const value = createTestValue(schema, 'oldValue');

      const wasUpdated = replaceForeignKeyValue({
        valueStore: value,
        foreignKey: 'tableId',
        value: 'oldValue',
        nextValue: 'newValue',
      });

      expect(wasUpdated).toBe(true);
      expect(value.value).toBe('newValue');
    });

    it('should not update string value with non-matching foreignKey', () => {
      const schema = getStringSchema({ foreignKey: 'tableId1' });
      const value = createTestValue(schema, 'oldValue');

      const wasUpdated = replaceForeignKeyValue({
        valueStore: value,
        foreignKey: 'tableId2',
        value: 'oldValue',
        nextValue: 'newValue',
      });

      expect(wasUpdated).toBe(false);
      expect(value.value).toBe('oldValue');
    });

    it('should not update string value with non-matching value', () => {
      const schema = getStringSchema({ foreignKey: 'tableId' });
      const value = createTestValue(schema, 'oldValue');

      const wasUpdated = replaceForeignKeyValue({
        valueStore: value,
        foreignKey: 'tableId',
        value: 'differentValue',
        nextValue: 'newValue',
      });

      expect(wasUpdated).toBe(false);
      expect(value.value).toBe('oldValue');
    });
  });

  describe('array values', () => {
    it('should update multiple values in array with matching foreignKey', () => {
      const schema = getArraySchema(getStringSchema({ foreignKey: 'tableId' }));
      const value = createTestValue(schema, [
        'value1',
        'targetValue',
        'value3',
        'targetValue',
      ]);

      const wasUpdated = replaceForeignKeyValue({
        valueStore: value,
        foreignKey: 'tableId',
        value: 'targetValue',
        nextValue: 'newValue',
      });

      expect(wasUpdated).toBe(true);
      expect(value.getPlainValue()).toEqual([
        'value1',
        'newValue',
        'value3',
        'newValue',
      ]);
    });
  });

  describe('nested objects', () => {
    const createNestedSchema = () =>
      getObjectSchema({
        field1: getStringSchema({ foreignKey: 'tableId1' }),
        field2: getStringSchema({ foreignKey: 'tableId2' }),
        nested: getObjectSchema({
          subField1: getStringSchema({ foreignKey: 'tableId1' }),
          subField2: getArraySchema(
            getStringSchema({ foreignKey: 'tableId1' }),
          ),
        }),
      });

    it('should update nested values in object with matching foreignKey', () => {
      const value = createTestValue(createNestedSchema(), {
        field1: 'targetValue',
        field2: 'value2',
        nested: {
          subField1: 'targetValue',
          subField2: ['value1', 'targetValue', 'value3'],
        },
      });

      const wasUpdated = replaceForeignKeyValue({
        valueStore: value,
        foreignKey: 'tableId1',
        value: 'targetValue',
        nextValue: 'newValue',
      });

      expect(wasUpdated).toBe(true);
      expect(value.getPlainValue()).toEqual({
        field1: 'newValue',
        field2: 'value2',
        nested: {
          subField1: 'newValue',
          subField2: ['value1', 'newValue', 'value3'],
        },
      });
    });

    it('should not update any values when no matches found', () => {
      const initialValue = {
        field1: 'value1',
        field2: 'value2',
      };
      const value = createTestValue(createNestedSchema(), initialValue);

      const wasUpdated = replaceForeignKeyValue({
        valueStore: value,
        foreignKey: 'tableId3',
        value: 'targetValue',
        nextValue: 'newValue',
      });

      expect(wasUpdated).toBe(false);
      expect(value.getPlainValue()).toEqual(initialValue);
    });
  });

  describe('complex structures', () => {
    describe('multiple foreign keys', () => {
      const createComplexSchema = () =>
        getObjectSchema({
          users: getArraySchema(
            getObjectSchema({
              id: getStringSchema({ foreignKey: 'usersTable' }),
              roles: getArraySchema(
                getStringSchema({ foreignKey: 'rolesTable' }),
              ),
              department: getObjectSchema({
                id: getStringSchema({ foreignKey: 'departmentsTable' }),
                manager: getStringSchema({ foreignKey: 'usersTable' }),
              }),
            }),
          ),
          settings: getObjectSchema({
            defaultRole: getStringSchema({ foreignKey: 'rolesTable' }),
            adminUser: getStringSchema({ foreignKey: 'usersTable' }),
          }),
        });

      const createComplexValue = () => ({
        users: [
          {
            id: 'user1',
            roles: ['role1', 'role2', 'role3'],
            department: {
              id: 'dept1',
              manager: 'user2',
            },
          },
          {
            id: 'user2',
            roles: ['role2', 'role3'],
            department: {
              id: 'dept2',
              manager: 'user1',
            },
          },
        ],
        settings: {
          defaultRole: 'role2',
          adminUser: 'user2',
        },
      });

      it('should update only matching foreign keys and values', () => {
        const value = createTestValue(
          createComplexSchema(),
          createComplexValue(),
        );

        const wasUpdatedRoles = replaceForeignKeyValue({
          valueStore: value,
          foreignKey: 'rolesTable',
          value: 'role2',
          nextValue: 'newRole',
        });
        expect(wasUpdatedRoles).toBe(true);
        expect(value.getPlainValue()).toMatchObject({
          users: [
            {
              roles: ['role1', 'newRole', 'role3'],
            },
            {
              roles: ['newRole', 'role3'],
            },
          ],
          settings: {
            defaultRole: 'newRole',
          },
        });

        const wasUpdatedUsers = replaceForeignKeyValue({
          valueStore: value,
          foreignKey: 'usersTable',
          value: 'user2',
          nextValue: 'newUser',
        });
        expect(wasUpdatedUsers).toBe(true);
        expect(value.getPlainValue()).toMatchObject({
          users: [
            {
              department: { manager: 'newUser' },
            },
            {
              id: 'newUser',
            },
          ],
          settings: {
            adminUser: 'newUser',
          },
        });
      });
    });

    describe('same foreign key with different values', () => {
      const createItemsSchema = () =>
        getObjectSchema({
          items: getArraySchema(
            getObjectSchema({
              id: getStringSchema({ foreignKey: 'itemsTable' }),
              relatedItems: getArraySchema(
                getStringSchema({ foreignKey: 'itemsTable' }),
              ),
              category: getObjectSchema({
                mainItem: getStringSchema({ foreignKey: 'itemsTable' }),
                alternativeItems: getArraySchema(
                  getStringSchema({ foreignKey: 'itemsTable' }),
                ),
              }),
            }),
          ),
        });

      const createItemsValue = () => ({
        items: [
          {
            id: 'item1',
            relatedItems: ['item2', 'item3', 'item1'],
            category: {
              mainItem: 'item2',
              alternativeItems: ['item1', 'item3', 'item2'],
            },
          },
          {
            id: 'item2',
            relatedItems: ['item1', 'item2'],
            category: {
              mainItem: 'item1',
              alternativeItems: ['item2', 'item3'],
            },
          },
        ],
      });

      it('should update only matching values for the same foreign key', () => {
        const value = createTestValue(createItemsSchema(), createItemsValue());

        const wasUpdated = replaceForeignKeyValue({
          valueStore: value,
          foreignKey: 'itemsTable',
          value: 'item2',
          nextValue: 'newItem',
        });

        expect(wasUpdated).toBe(true);
        expect(value.getPlainValue()).toMatchObject({
          items: [
            {
              relatedItems: ['newItem', 'item3', 'item1'],
              category: {
                mainItem: 'newItem',
                alternativeItems: ['item1', 'item3', 'newItem'],
              },
            },
            {
              id: 'newItem',
              relatedItems: ['item1', 'newItem'],
              category: {
                alternativeItems: ['newItem', 'item3'],
              },
            },
          ],
        });
      });
    });
  });
});
