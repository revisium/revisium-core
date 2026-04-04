import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { nanoid } from 'nanoid';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const KEY_PREFIX = 'rev_';
const KEY_RANDOM_LENGTH = 22;
const KEY_FORMAT_REGEX = /^rev_[A-Za-z0-9_-]{22}$/;

@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  generateKey(): { key: string; hash: string; prefix: string } {
    const random = nanoid(KEY_RANDOM_LENGTH);
    const key = `${KEY_PREFIX}${random}`;
    const hash = createHash('sha256').update(key).digest('hex');

    return { key, hash, prefix: KEY_PREFIX };
  }

  validateKeyFormat(key: string): boolean {
    return KEY_FORMAT_REGEX.test(key);
  }

  hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  async findByHash(keyHash: string) {
    return this.prisma.apiKey.findUnique({
      where: { keyHash },
    });
  }
}
