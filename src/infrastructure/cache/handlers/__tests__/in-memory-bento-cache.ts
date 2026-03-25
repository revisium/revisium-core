/**
 * In-memory BentoCache implementation for e2e cache invalidation tests.
 * Provides real caching behavior (stores values, supports tag-based invalidation)
 * without requiring Redis or external dependencies.
 */
export class InMemoryBentoCache {
  private store = new Map<string, { value: unknown; tags: string[] }>();

  async getOrSet(options: {
    key: string;
    tags?: string[];
    factory: (ctx: unknown) => Promise<unknown>;
  }) {
    if (this.store.has(options.key)) {
      return this.store.get(options.key)!.value;
    }

    const noopCtx = {
      setOptions: () => true,
      setTags: () => {},
      fail: () => {},
      skip: () => {},
      setTtl: () => {},
      gracedEntry: undefined,
    };

    const value = await options.factory(noopCtx);
    this.store.set(options.key, { value, tags: options.tags || [] });
    return value;
  }

  async delete(options: { key: string }) {
    this.store.delete(options.key);
    return true;
  }

  async deleteByTag(options: { tags: string[] }) {
    const tagsToDelete = new Set(options.tags);
    for (const [key, entry] of this.store) {
      if (entry.tags.some((t) => tagsToDelete.has(t))) {
        this.store.delete(key);
      }
    }
    return true;
  }

  clear() {
    this.store.clear();
  }
}
