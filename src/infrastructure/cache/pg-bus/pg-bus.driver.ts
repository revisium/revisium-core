import { Client, Pool } from 'pg';
import {
  BusDriver,
  BusOptions,
  CacheBusMessage,
  CreateBusDriverResult,
} from 'bentocache/types';

const CHANNEL_NAME_RE = /^[a-z_][a-z0-9_$.:]{0,62}$/i;

const MAX_PAYLOAD_BYTES = 8000;

function escapeIdentifier(str: string): string {
  return '"' + str.replace(/"/g, '""') + '"';
}

export type PgBusDriverOptions = {
  connectionString: string;
  applicationName?: string;
  reconnectDelayMs?: number;
  log?: Pick<Console, 'log' | 'warn' | 'error'>;
  debug?: boolean;
};

export class PgBusDriver implements BusDriver {
  private listener?: Client;
  private readonly publisher: Pool;
  private readonly handlers = new Map<string, (m: CacheBusMessage) => void>();
  private readonly reconnectCallbacks: Array<() => void> = [];
  private connecting = false;
  private destroyed = false;
  private connectingPromise?: Promise<void>;

  private id?: string;
  public setId = (id: string) => {
    this.id = id;
    return this;
  };

  private readonly cs: string;
  private readonly app: string;
  private readonly delay: number;
  private readonly log: Required<PgBusDriverOptions>['log'];
  private readonly debug: boolean;

  constructor(opts: PgBusDriverOptions) {
    this.cs = opts.connectionString;
    this.app = opts.applicationName ?? 'pg-bus';
    this.delay = opts.reconnectDelayMs ?? 1000;
    this.log = opts.log ?? console;
    this.debug = opts.debug ?? false;

    this.publisher = new Pool({
      connectionString: this.cs,
      application_name: `${this.app}:pub`,
    });
  }

  async publish(channel: string, message: CacheBusMessage): Promise<void> {
    this.assertChannel(channel);

    if (!this.id) {
      throw new Error('You must set an id before publishing a message');
    }

    const wrappedMessage = {
      payload: message ?? {},
      busId: this.id,
    };

    const payload = JSON.stringify(wrappedMessage);
    const bytes = Buffer.byteLength(payload, 'utf8');
    if (bytes > MAX_PAYLOAD_BYTES) {
      throw new Error(
        `NOTIFY payload too large: ${bytes} > ${MAX_PAYLOAD_BYTES}`,
      );
    }
    await this.publisher.query('SELECT pg_notify($1::text, $2::text)', [
      channel,
      payload,
    ]);
  }

  async subscribe(
    channel: string,
    handler: (m: CacheBusMessage) => void,
  ): Promise<void> {
    this.assertChannel(channel);
    this.handlers.set(channel, handler);
    await this.ensureConnected();
    if (this.handlers.get(channel) !== handler) return;
    await this.listen(channel);
  }

  async unsubscribe(channel: string): Promise<void> {
    this.handlers.delete(channel);
    if (!this.listener) return;
    try {
      this.assertChannel(channel);
      await this.listener.query(`UNLISTEN ${escapeIdentifier(channel)}`);
    } catch (e) {
      this.log.warn('[pg-bus] failed to UNLISTEN:', e);
    }
  }

  async disconnect(): Promise<void> {
    this.destroyed = true;
    if (this.listener) {
      try {
        await this.listener.query('UNLISTEN *');
      } catch (e) {
        this.log.warn('[pg-bus] failed to UNLISTEN * on disconnect:', e);
      }
      try {
        await this.listener.end();
      } catch (e) {
        this.log.warn('[pg-bus] failed to close listener connection:', e);
      }
      this.listener = undefined;
    }
    try {
      await this.publisher.end();
    } catch (e) {
      this.log.warn('[pg-bus] failed to close publisher pool:', e);
    }
  }

  onReconnect(cb: () => void): void {
    this.reconnectCallbacks.push(cb);
  }

  private assertChannel(name: string) {
    if (!CHANNEL_NAME_RE.test(name)) {
      throw new Error(`Invalid channel "${name}"`);
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.listener || this.destroyed) return;
    if (this.connecting && this.connectingPromise) {
      await this.connectingPromise;
      return;
    }
    this.connecting = true;
    this.connectingPromise = (async () => {
      const client = new Client({
        connectionString: this.cs,
        application_name: `${this.app}:listen`,
      });
      client.on('error', (err) => {
        this.log.error('[pg-bus] listener error:', err);
        this.reconnectSoon();
      });
      client.on('end', () => {
        this.log.warn('[pg-bus] listener ended');
        this.reconnectSoon();
      });

      try {
        await client.connect();
        client.on('notification', (n) =>
          this.onNotification(n.channel, n.payload ?? ''),
        );
        this.listener = client;

        for (const ch of this.handlers.keys()) {
          await this.listen(ch);
        }

        for (const cb of this.reconnectCallbacks) {
          try {
            cb();
          } catch (e) {
            this.log.warn('[pg-bus] onReconnect cb error:', e);
          }
        }

        if (this.debug) {
          this.log.log('[pg-bus] LISTEN connected');
        }
      } catch (e) {
        this.log.error('[pg-bus] connect failed:', e);
        await this.sleep(this.delay);
        this.reconnectSoon();
      } finally {
        this.connecting = false;
      }
    })();
    try {
      await this.connectingPromise;
    } finally {
      this.connectingPromise = undefined;
    }
  }

  private async listen(channel: string) {
    if (!this.listener) return;
    try {
      this.assertChannel(channel);
      await this.listener.query(`LISTEN ${escapeIdentifier(channel)}`);
    } catch (e) {
      this.log.warn(`[pg-bus] failed to LISTEN ${channel}:`, e);
    }
  }

  private onNotification(channel: string, raw: string) {
    const h = this.handlers.get(channel);
    if (!h) return;
    try {
      const wrappedMsg = raw ? JSON.parse(raw) : { payload: {}, busId: null };

      if (wrappedMsg.busId === this.id) {
        if (this.debug) {
          this.log?.log?.(
            '[pg-bus] ignoring message published by the same bus instance',
          );
        }
        return;
      }

      const payload = wrappedMsg.payload as CacheBusMessage;
      h(payload);
    } catch (e) {
      const rawStr = String(raw ?? '');
      const preview =
        rawStr.length > 256
          ? `${rawStr.slice(0, 256)}…(+${rawStr.length - 256} bytes)`
          : rawStr;
      this.log.warn(`[pg-bus] invalid JSON payload on ${channel}:`, preview, e);
    }
  }

  private async reconnectSoon() {
    if (this.destroyed) return;
    try {
      if (this.listener) {
        try {
          await this.listener.end();
        } catch (e) {
          this.log.warn(
            '[pg-bus] failed to close listener during reconnect:',
            e,
          );
        }
      }
    } catch (e) {
      this.log.warn('[pg-bus] unexpected error in reconnectSoon:', e);
    }
    this.listener = undefined;
    await this.sleep(this.delay);
    await this.ensureConnected();
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

export function pgBusDriver(
  opts: PgBusDriverOptions,
  busOptions?: BusOptions,
): CreateBusDriverResult {
  return {
    factory: () => new PgBusDriver(opts),

    options: {
      retryQueue: {
        enabled: busOptions?.retryQueue?.enabled ?? true,
        maxSize: busOptions?.retryQueue?.maxSize,
      },
    },
  };
}
