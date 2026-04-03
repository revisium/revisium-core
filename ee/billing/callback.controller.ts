import {
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { LimitsService } from './limits/limits.service';
import { BillingCacheService } from './cache/billing-cache.service';
import { verifyRequest } from './hmac';

@Controller('billing')
export class BillingCallbackController {
  private readonly logger = new Logger(BillingCallbackController.name);
  private readonly secret: string;

  constructor(
    private readonly limitsService: LimitsService,
    private readonly billingCache: BillingCacheService,
    configService: ConfigService,
  ) {
    this.secret = configService.get<string>('PAYMENT_SERVICE_SECRET', '');
  }

  @Post('payment-callback')
  @HttpCode(HttpStatus.OK)
  async handleCallback(
    @Req() req: Request,
    @Headers('x-signature') signature: string,
    @Headers('x-timestamp') timestamp: string,
  ): Promise<void> {
    const rawBody =
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (
      !signature ||
      !timestamp ||
      !verifyRequest(this.secret, rawBody, signature, timestamp)
    ) {
      throw new UnauthorizedException('Invalid signature');
    }

    const payload =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (payload?.organizationId) {
      this.limitsService.invalidateCache(payload.organizationId);
      await this.billingCache.invalidateOrgBilling(payload.organizationId);
      this.logger.log(
        `Cache invalidated: event=${payload.event} org=${payload.organizationId}`,
      );
    }
  }
}
