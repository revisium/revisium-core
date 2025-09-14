import { NoopBentoCache } from '../services/noop-bento-cache';
import type { CacheLike } from '../cache.locator';

describe('NoopBentoCache', () => {
  let cache: CacheLike;

  beforeEach(() => {
    cache = new NoopBentoCache();
  });

  it('get() always returns undefined', async () => {
    await expect(cache.get({ key: 'any' })).resolves.toBeUndefined();
    await expect(cache.get({ key: '' })).resolves.toBeUndefined();
  });

  it('set() always returns false', async () => {
    await expect(
      cache.set({ key: 'k', value: { a: 1 }, ttl: 123, tags: ['x'] }),
    ).resolves.toBe(false);

    await expect(cache.set({ key: 'k2', value: 'v' })).resolves.toBe(false);
  });

  it('deleteByTag() always returns false', async () => {
    await expect(cache.deleteByTag({ tags: ['a', 'b'] })).resolves.toBe(false);

    await expect(cache.deleteByTag({ tags: [] })).resolves.toBe(false);
  });

  it('namespace() returns a new independent NoopBentoCache instance', () => {
    const ns1 = cache.namespace('ns1');
    const ns2 = cache.namespace('ns2');

    expect(ns1).toBeInstanceOf(NoopBentoCache);
    expect(ns2).toBeInstanceOf(NoopBentoCache);
    expect(ns1).not.toBe(ns2);
    expect(ns1).not.toBe(cache);
  });

  it('namespace() can be chained and all methods still behave as no-op', async () => {
    const nested = cache.namespace('a').namespace('b').namespace('c');

    expect(nested).toBeInstanceOf(NoopBentoCache);

    await expect(nested.get({ key: 'x' })).resolves.toBeUndefined();
    await expect(nested.set({ key: 'x', value: 42 })).resolves.toBe(false);
    await expect(nested.deleteByTag({ tags: ['t'] })).resolves.toBe(false);
  });

  it('methods never throw errors', async () => {
    await expect(cache.get({ key: 'x' })).resolves.not.toThrow();
    await expect(cache.set({ key: 'x', value: null })).resolves.not.toThrow();
    await expect(cache.deleteByTag({ tags: ['t'] })).resolves.not.toThrow();
  });
});
