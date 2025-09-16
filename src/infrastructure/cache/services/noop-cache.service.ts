import { GetOrSetOptions, GetSetFactoryContext } from 'bentocache/types';

/**
 * Noop implementation of BentoCache interface
 * Used when caching is disabled
 */
export class NoopCacheService {
  public getOrSet<T>(options: GetOrSetOptions<T>): T | Promise<T> {
    return options.factory(noopGetSetFactory);
  }
}

const noopGetSetFactory: GetSetFactoryContext = {
  setOptions: () => true,
  setTags: () => {},
  fail: () => {},
  skip: () => {},
  setTtl: () => {},
  gracedEntry: undefined,
};
