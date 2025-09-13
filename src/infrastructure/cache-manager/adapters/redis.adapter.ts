import { createClient, RedisClientType } from 'redis';
import { CacheAdapter } from './cache.adapter';

export class RedisAdapter implements CacheAdapter {
  constructor(private readonly redis: RedisClientType) {}

  static async connect(url: string) {
    const client: RedisClientType = createClient({ url });
    await client.connect();
    return new RedisAdapter(client);
  }

  private tagSet(tag: string) {
    return `tag:${tag}`;
  }

  private keyTags(key: string) {
    return `keytags:${key}`;
  }

  public async get<T>(key: string): Promise<T | undefined> {
    const raw = await this.redis.get(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  }

  public async set<T>(
    key: string,
    value: T,
    opts?: { ttlSec?: number; tags?: string[] },
  ): Promise<void> {
    const raw = JSON.stringify(value);

    if (opts?.ttlSec) {
      await this.redis.set(key, raw, { EX: opts.ttlSec });
    } else {
      await this.redis.set(key, raw);
    }

    if (opts?.tags?.length) {
      const multi = this.redis.multi();

      for (const tag of opts.tags) {
        multi.sAdd(this.tagSet(tag), key);
        multi.sAdd(this.keyTags(key), tag);
      }

      await multi.exec();
    }
  }

  async del(key: string): Promise<void> {
    const multi = this.redis.multi();
    multi.del(key);
    multi.sMembers(this.keyTags(key));

    const result = await multi.exec();

    const tags = (result?.[1] as unknown as string[]) || [];

    if (tags.length) {
      const m2 = this.redis.multi();
      for (const tag of tags) {
        m2.sRem(this.tagSet(tag), key);
      }
      m2.del(this.keyTags(key));
      await m2.exec();
    } else {
      await this.redis.del(this.keyTags(key));
    }
  }

  public async delByTags(tags: string[]): Promise<void> {
    const keys = await this.getKeysByTags(tags);

    const multi = this.redis.multi();

    if (keys.length) {
      (multi as any).del(...keys);
    }

    for (const tag of tags) {
      multi.del(this.tagSet(tag));
    }

    for (const key of keys) {
      multi.del(this.keyTags(key));
    }

    await multi.exec();
  }

  async getWithMeta<T>(
    key: string,
  ): Promise<{ value: T; ttlSec?: number; tags?: string[] } | undefined> {
    const multi = this.redis.multi();
    multi.get(key);
    multi.ttl(key);
    multi.sMembers(this.keyTags(key));
    const res = await multi.exec();

    const raw = res?.[0] as unknown as string | null;
    if (!raw) {
      return undefined;
    }

    const ttl = (res?.[1] as unknown as number) ?? -1;
    const tags = (res?.[2] as unknown as string[]) ?? [];
    return {
      value: JSON.parse(raw) as T,
      ttlSec: ttl > 0 ? ttl : undefined,
      tags,
    };
  }

  private async getKeysByTags(tags: string[]): Promise<string[]> {
    const multi = this.redis.multi();

    for (const tag of tags) {
      multi.sMembers(this.tagSet(tag));
    }

    const result = await multi.exec();

    const keys = new Set<string>();

    result.forEach((item) =>
      (item as unknown as string[]).forEach((k) => keys.add(k)),
    );

    return Array.from(keys);
  }
}
