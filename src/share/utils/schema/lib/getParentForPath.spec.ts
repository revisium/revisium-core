import { getParentForPath } from 'src/share/utils/schema/lib/getParentForPath';

describe('getParentForPath', () => {
  it('invalid path', () => {
    expect(() => getParentForPath('')).toThrow('Invalid path');
    expect(() => getParentForPath('/')).toThrow('Invalid path');
    expect(() => getParentForPath('/properties')).toThrow('Invalid path');
    expect(() => getParentForPath('/properties/field/properties')).toThrow(
      'Invalid path',
    );
    expect(() => getParentForPath('/properties/field/items/field')).toThrow(
      'Invalid path',
    );
    expect(() =>
      getParentForPath('/properties/field/items/items/field'),
    ).toThrow('Invalid path');
    expect(() =>
      getParentForPath('/properties/field/items/properties'),
    ).toThrow('Invalid path');
  });

  it('expect parent', () => {
    expect(getParentForPath('/items')).toEqual({
      parentPath: '',
      field: 'items',
    });

    expect(getParentForPath('/properties/field')).toEqual({
      parentPath: '',
      field: 'field',
    });

    expect(getParentForPath('/properties/field/properties/subArray')).toEqual({
      parentPath: '/properties/field',
      field: 'subArray',
    });

    expect(
      getParentForPath('/properties/field/properties/subArray/items'),
    ).toEqual({
      parentPath: '/properties/field/properties/subArray',
      field: 'items',
    });

    expect(getParentForPath('/properties/field/properties/items')).toEqual({
      parentPath: '/properties/field',
      field: 'items',
    });

    expect(
      getParentForPath('/properties/field/properties/properties/items'),
    ).toEqual({
      parentPath: '/properties/field/properties/properties',
      field: 'items',
    });
  });

  it('expect parent for items of arrays', () => {
    expect(
      getParentForPath('/properties/field/items/properties/subField'),
    ).toEqual({
      parentPath: '/properties/field/items',
      field: 'subField',
    });

    expect(getParentForPath('/items/properties/subField')).toEqual({
      parentPath: '/items',
      field: 'subField',
    });

    expect(
      getParentForPath(
        '/properties/field/properties/properties/items/properties/subField',
      ),
    ).toEqual({
      parentPath: '/properties/field/properties/properties/items',
      field: 'subField',
    });

    expect(
      getParentForPath(
        '/properties/field/properties/properties/items/items/properties/subField',
      ),
    ).toEqual({
      parentPath: '/properties/field/properties/properties/items/items',
      field: 'subField',
    });

    expect(getParentForPath('/items/items')).toEqual({
      parentPath: '/items',
      field: 'items',
    });

    expect(
      getParentForPath('/properties/field/properties/properties/items/items'),
    ).toEqual({
      parentPath: '/properties/field/properties/properties/items',
      field: 'items',
    });
  });
});
