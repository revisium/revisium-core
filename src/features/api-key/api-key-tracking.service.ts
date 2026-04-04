import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const FLUSH_INTERVAL_MS = 60_000;
const MAX_IP_LENGTH = 45;

interface LastUsedEntry {
  ip: string;
  timestamp: Date;
}

@Injectable()
export class ApiKeyTrackingService implements OnModuleDestroy {
  private readonly logger = new Logger(ApiKeyTrackingService.name);
  private readonly buffer = new Map<string, LastUsedEntry>();
  private flushing: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleDestroy() {
    await this.flush();
  }

  track(keyId: string, ip: string): void {
    const normalizedIp = ip.split(',')[0]?.trim().slice(0, MAX_IP_LENGTH);
    if (!normalizedIp) {
      return;
    }
    this.buffer.set(keyId, { ip: normalizedIp, timestamp: new Date() });
  }

  @Interval(FLUSH_INTERVAL_MS)
  async flush(): Promise<void> {
    if (this.flushing) {
      return this.flushing;
    }

    this.flushing = this.doFlush().finally(() => {
      this.flushing = null;
    });

    return this.flushing;
  }

  private async doFlush(): Promise<void> {
    if (this.buffer.size === 0) {
      return;
    }

    const entries = new Map(this.buffer);
    this.buffer.clear();

    const results = await Promise.all(
      Array.from(entries.entries()).map(([keyId, entry]) =>
        this.prisma.apiKey
          .update({
            where: { id: keyId },
            data: {
              lastUsedAt: entry.timestamp,
              lastUsedIp: entry.ip,
            },
          })
          .then(() => ({ keyId, success: true as const }))
          .catch((error) => ({ keyId, success: false as const, error })),
      ),
    );

    for (const result of results) {
      if (!result.success) {
        this.logger.warn(
          `Failed to flush lastUsedAt for key ${result.keyId}: ${result.error}`,
        );
        const entry = entries.get(result.keyId);
        if (entry && !this.buffer.has(result.keyId)) {
          this.buffer.set(result.keyId, entry);
        }
      }
    }
  }
}
