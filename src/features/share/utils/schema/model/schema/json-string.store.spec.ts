import { JsonStringStore } from 'src/features/share/utils/schema/model/schema/json-string.store';
import { JsonStringValueStore } from 'src/features/share/utils/schema/model/value/json-string-value.store';

describe('JsonStringStore', () => {
  it('foreignKey', () => {
    const store = new JsonStringStore();

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
    });

    store.foreignKey = 'tableId';

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
      foreignKey: 'tableId',
    });
  });

  it('title', () => {
    const store = new JsonStringStore();

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
    });

    store.title = 'title';

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
      title: 'title',
    });
  });

  it('description', () => {
    const store = new JsonStringStore();

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
    });

    store.description = 'description';

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
      description: 'description',
    });
  });

  it('deprecated', () => {
    const store = new JsonStringStore();

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
    });

    store.deprecated = true;

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
      deprecated: true,
    });
  });

  it('readOnly', () => {
    const store = new JsonStringStore();

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
    });

    store.readOnly = true;

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
      readOnly: true,
    });
  });

  it('pattern', () => {
    const store = new JsonStringStore();

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
    });

    store.pattern = 'pattern';

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
      pattern: 'pattern',
    });
  });

  it('enum', () => {
    const store = new JsonStringStore();

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
    });

    store.enum = ['1', '2', '3'];

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
      enum: ['1', '2', '3'],
    });
  });

  it('date', () => {
    const store = new JsonStringStore();

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
    });

    store.format = 'date';

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
      format: 'date',
    });
  });

  it('contentMediaType', () => {
    const store = new JsonStringStore();

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
    });

    store.contentMediaType = 'text/markdown';

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
      contentMediaType: 'text/markdown',
    });
  });

  it('registerValue', () => {
    const store = new JsonStringStore();

    expect(store.getValue('row-1')).toBeUndefined();
    expect(store.getValue('row-2')).toBeUndefined();

    const value1_1 = new JsonStringValueStore(store, 'row-1', 'value1_1');
    expect(value1_1.index).toEqual(0);
    const value1_2 = new JsonStringValueStore(store, 'row-1', 'value1_2');
    expect(value1_2.index).toEqual(1);
    const value2 = new JsonStringValueStore(store, 'row-2', 'value2');
    expect(value2.index).toEqual(0);

    expect(store.getValue('row-1')).toEqual(value1_1);
    expect(store.getValue('row-1', 1)).toEqual(value1_2);
    expect(store.getValue('row-2', 0)).toEqual(value2);
  });

  it('should return $ref', () => {
    const store = new JsonStringStore();
    store.$ref = 'ref.json';

    expect(store.getPlainSchema()).toStrictEqual({
      $ref: 'ref.json',
    });
  });
});
