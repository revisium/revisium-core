import { JsonStringStore } from 'src/share/utils/schema/model/schema/json-string.store';
import { JsonStringValueStore } from 'src/share/utils/schema/model/value/json-string-value.store';

describe('JsonStringStore', () => {
  it('reference', () => {
    const store = new JsonStringStore();

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
    });

    store.reference = 'tableId';

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
      reference: 'tableId',
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
});
