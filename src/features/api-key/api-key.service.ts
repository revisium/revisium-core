import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { nanoid } from 'nanoid';
import { AuthCacheService } from 'src/infrastructure/cache/services/auth-cache.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const KEY_PREFIX = 'rev_';
const KEY_RANDOM_LENGTH = 22;
const KEY_FORMAT_REGEX = /^rev_[A-Za-z0-9_-]{22}$/;

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authCache: AuthCacheService,
  ) {}

  generateKey(): { key: string; hash: string; prefix: string } {
    const random = nanoid(KEY_RANDOM_LENGTH);
    const key = `${KEY_PREFIX}${random}`;
    const hash = createHash('sha256').update(key).digest('hex');

    const prefix = `${KEY_PREFIX}${random.slice(0, 4)}...${random.slice(-4)}`;

    return { key, hash, prefix };
  }

  validateKeyFormat(key: string): boolean {
    return KEY_FORMAT_REGEX.test(key);
  }

  hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  async findByHash(keyHash: string) {
    return this.authCache.apiKeyByHash(keyHash, () =>
      this.prisma.apiKey.findUnique({
        where: { keyHash },
      }),
    );
  }
}
