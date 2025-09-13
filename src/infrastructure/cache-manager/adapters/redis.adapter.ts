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
      }

      await multi.exec();
    }
  }

  public async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  public async delByTags(tags: string[]): Promise<void> {
    const keys = await this.getKeysByTags(tags);

    const multi = this.redis.multi();

    if (keys.length) {
      multi.del(keys);
    }

    for (const tag of tags) {
      multi.del(this.tagSet(tag));
    }

    await multi.exec();
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
