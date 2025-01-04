import { JsonNumberStore } from 'src/features/share/utils/schema/model/schema/json-number.store';
import { JsonNumberValueStore } from 'src/features/share/utils/schema/model/value/json-number-value.store';

describe('JsonNumberStore', () => {
  it('registerValue', () => {
    const store = new JsonNumberStore();

    expect(store.getValue('row-1')).toBeUndefined();
    expect(store.getValue('row-2')).toBeUndefined();

    const value1_1 = new JsonNumberValueStore(store, 'row-1', 1);
    expect(value1_1.index).toEqual(0);
    const value1_2 = new JsonNumberValueStore(store, 'row-1', 2);
    expect(value1_2.index).toEqual(1);
    const value2 = new JsonNumberValueStore(store, 'row-2', 3);
    expect(value2.index).toEqual(0);

    expect(store.getValue('row-1', 0)).toEqual(value1_1);
    expect(store.getValue('row-1', 1)).toEqual(value1_2);
    expect(store.getValue('row-2', 0)).toEqual(value2);
  });
});
