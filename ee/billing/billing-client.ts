import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IBillingClient,
  OrgLimits,
  SubscriptionInfo,
  PlanInfo,
  ProviderInfo,
  CreateCheckoutParams,
  UsageReport,
} from './billing-client.interface';
import { signRequest } from './hmac';

const FETCH_TIMEOUT_MS = 10_000;

@Injectable()
export class BillingClient implements IBillingClient {
  private readonly logger = new Logger(BillingClient.name);
  private readonly baseUrl: string;
  private readonly secret: string;
  readonly configured: boolean;

  constructor(configService: ConfigService) {
    this.baseUrl = configService.get<string>('PAYMENT_SERVICE_URL', '');
    this.secret = configService.get<string>('PAYMENT_SERVICE_SECRET', '');
    this.configured = !!this.baseUrl;
    if (!this.configured) {
      this.logger.warn(
        'PAYMENT_SERVICE_URL not configured — billing disabled',
      );
    }
  }

  async getOrgLimits(organizationId: string): Promise<OrgLimits> {
    return this.get(`/orgs/${organizationId}/limits`);
  }

  async createCheckout(
    params: CreateCheckoutParams,
  ): Promise<{ checkoutUrl: string }> {
    return this.post('/checkout', params);
  }

  async cancelSubscription(
    organizationId: string,
    cancelAtPeriodEnd?: boolean,
  ): Promise<void> {
    await this.post('/cancel', { organizationId, cancelAtPeriodEnd });
  }

  async getSubscription(
    organizationId: string,
  ): Promise<SubscriptionInfo | null> {
    try {
      return await this.get(`/orgs/${organizationId}/subscription`);
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  }

  async getProviders(params: {
    country?: string;
    method?: string;
  }): Promise<ProviderInfo[]> {
    const qs = new URLSearchParams();
    if (params.country) qs.set('country', params.country);
    if (params.method) qs.set('method', params.method);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const result = await this.get<{ providers: ProviderInfo[] }>(
      `/providers${suffix}`,
    );
    return result.providers;
  }

  async getPortalUrl(
    organizationId: string,
    returnUrl: string,
  ): Promise<{ url: string | null }> {
    const qs = new URLSearchParams({ organizationId, returnUrl });
    return this.get(`/portal?${qs.toString()}`);
  }

  async getPlans(): Promise<PlanInfo[]> {
    const result = await this.get<{ plans: PlanInfo[] }>('/plans');
    return result.plans;
  }

  async getPlan(planId: string): Promise<PlanInfo | null> {
    try {
      return await this.get(`/plans/${planId}`);
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  }

  async activateEarlyAccess(
    organizationId: string,
    planId: string,
  ): Promise<{ status: string; planId: string }> {
    return this.post(`/orgs/${organizationId}/early-access`, { planId });
  }

  async reportUsage(organizationId: string, usage: UsageReport): Promise<void> {
    await this.post(`/orgs/${organizationId}/usage/report`, usage);
  }

  private async get<T = unknown>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const { signature, timestamp } = signRequest(this.secret, '');

    const response = await fetch(url, {
      headers: {
        'X-Signature': signature,
        'X-Timestamp': timestamp,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new HttpError(
        response.status,
        `GET ${path} failed: ${response.status} ${errorBody.slice(0, 200)}`,
      );
    }

    return response.json() as Promise<T>;
  }

  private async post<T = void>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const bodyStr = JSON.stringify(body);
    const { signature, timestamp } = signRequest(this.secret, bodyStr);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': timestamp,
      },
      body: bodyStr,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new HttpError(
        response.status,
        `POST ${path} failed: ${response.status} ${errorBody.slice(0, 200)}`,
      );
    }

    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
