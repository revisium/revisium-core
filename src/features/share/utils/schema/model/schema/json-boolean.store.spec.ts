import { JsonBooleanStore } from 'src/features/share/utils/schema/model/schema/json-boolean.store';
import { JsonBooleanValueStore } from 'src/features/share/utils/schema/model/value/json-boolean-value.store';

describe('JsonBooleanStore', () => {
  it('registerValue', () => {
    const store = new JsonBooleanStore();

    expect(store.getValue('row-1')).toBeUndefined();
    expect(store.getValue('row-2')).toBeUndefined();

    const value1_1 = new JsonBooleanValueStore(store, 'row-1', true);
    expect(value1_1.index).toEqual(0);
    const value1_2 = new JsonBooleanValueStore(store, 'row-1', false);
    expect(value1_2.index).toEqual(1);
    const value2 = new JsonBooleanValueStore(store, 'row-2', true);
    expect(value2.index).toEqual(0);

    expect(store.getValue('row-1', 0)).toEqual(value1_1);
    expect(store.getValue('row-1', 1)).toEqual(value1_2);
    expect(store.getValue('row-2', 0)).toEqual(value2);
  });

  it('should return $ref', () => {
    const store = new JsonBooleanStore();
    store.$ref = 'ref.json';

    expect(store.getPlainSchema()).toStrictEqual({
      $ref: 'ref.json',
    });

    store.deprecated = true;
    store.title = 'title';
    store.description = 'description';
    expect(store.getPlainSchema()).toStrictEqual({
      $ref: 'ref.json',
      deprecated: true,
      description: 'description',
      title: 'title',
    });
  });

  it('title', () => {
    const store = new JsonBooleanStore();

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'boolean',
      default: false,
    });

    store.title = 'title';

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'boolean',
      default: false,
      title: 'title',
    });
  });

  it('description', () => {
    const store = new JsonBooleanStore();

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'boolean',
      default: false,
    });

    store.description = 'description';

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'boolean',
      default: false,
      description: 'description',
    });
  });

  it('deprecated', () => {
    const store = new JsonBooleanStore();

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'boolean',
      default: false,
    });

    store.deprecated = true;

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'boolean',
      default: false,
      deprecated: true,
    });
  });

  it('readOnly', () => {
    const store = new JsonBooleanStore();

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'boolean',
      default: false,
    });

    store.readOnly = true;

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'boolean',
      default: false,
      readOnly: true,
    });
  });
});
