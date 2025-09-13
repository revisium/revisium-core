import {
  canonicalStringify,
  makeCacheKey,
  makeCacheKeyFromArgs,
} from '../stable-cache-key';

describe('stable-cache-key', () => {
  it('produces same key for objects with different key order', () => {
    const a = { b: 2, a: 1, c: { y: 2, x: 1 } };
    const b = { c: { x: 1, y: 2 }, a: 1, b: 2 };

    const k1 = makeCacheKey(a);
    const k2 = makeCacheKey(b);
    expect(k1).toBe(k2);
  });

  it('array order matters', () => {
    const k1 = makeCacheKey({ list: [1, 2, 3] });
    const k2 = makeCacheKey({ list: [3, 2, 1] });
    expect(k1).not.toBe(k2);
  });

  it('drops undefined properties (same as missing)', () => {
    const k1 = makeCacheKey({ a: 1 });
    const k2 = makeCacheKey({ a: 1, b: undefined as any });
    expect(k1).toBe(k2);
  });

  it('respects null vs undefined difference', () => {
    const k1 = makeCacheKey({ a: null });
    const k2 = makeCacheKey({});
    expect(k1).not.toBe(k2);
  });

  it('works with nested structures', () => {
    const obj = {
      a: [
        { z: 1, y: 2 },
        { y: 2, z: 1 },
      ],
      b: { c: 3 },
    };
    const s = canonicalStringify(obj);
    expect(s).toBe('{"a":[{"y":2,"z":1},{"y":2,"z":1}],"b":{"c":3}}');
  });

  it('different primitives produce different keys', () => {
    const n = makeCacheKey(42);
    const s = makeCacheKey('42');
    expect(n).not.toBe(s);
  });

  it('prefix and version change the key', () => {
    const base = makeCacheKey({ a: 1 });
    const prefixed = makeCacheKey({ a: 1 }, { prefix: 'authctx' });
    const v2 = makeCacheKey({ a: 1 }, { version: 2 });

    expect(prefixed).toMatch(/^authctx:/);
    expect(prefixed.slice('authctx:'.length)).toHaveLength(base.length);
    expect(v2).not.toBe(base);
  });

  it('tuple of args is stable', () => {
    const k1 = makeCacheKeyFromArgs([{ q: { b: 2, a: 1 } }, 'user-1']);
    const k2 = makeCacheKeyFromArgs([{ q: { a: 1, b: 2 } }, 'user-1']);
    const k3 = makeCacheKeyFromArgs([{ q: { a: 1, b: 2 } }, 'user-2']);

    expect(k1).toBe(k2);
    expect(k1).not.toBe(k3);
  });

  it('toJSON() is respected', () => {
    const withToJSON = {
      date: new Date('2020-01-01T00:00:00.000Z'),
      toJSON() {
        return { date: '2020-01-01' };
      },
    };
    const plain = { date: '2020-01-01' };

    expect(makeCacheKey(withToJSON)).toBe(makeCacheKey(plain));
  });

  it('encoding can be hex', () => {
    const hexKey = makeCacheKey({ a: 1 }, { encoding: 'hex' });
    expect(hexKey).toMatch(/^[0-9a-f]+$/);
  });
});
