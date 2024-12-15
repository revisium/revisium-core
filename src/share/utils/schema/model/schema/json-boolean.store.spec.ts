import { JsonBooleanStore } from 'src/share/utils/schema/model/schema/json-boolean.store';
import { JsonBooleanValueStore } from 'src/share/utils/schema/model/value/json-boolean-value.store';

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
});
