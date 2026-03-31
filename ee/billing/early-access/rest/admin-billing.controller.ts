import {
  Body,
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { HTTPSystemGuard } from 'src/features/auth/guards/system.guard';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import { EarlyAccessService } from '../early-access.service';
import { AdminUpdateSubscriptionDto } from './dto/admin-update-subscription.dto';

@UseInterceptors(RestMetricsInterceptor)
@UseGuards(HttpJwtAuthGuard, HTTPSystemGuard)
@PermissionParams({
  action: PermissionAction.update,
  subject: PermissionSubject.Organization,
})
@Controller('admin/billing')
@ApiBearerAuth('access-token')
@ApiTags('Admin Billing')
export class AdminBillingController {
  constructor(private readonly earlyAccessService: EarlyAccessService) {}

  @Post('subscription')
  @ApiOperation({
    operationId: 'adminUpdateSubscription',
    summary: 'Create or update subscription for an organization',
  })
  async updateSubscription(@Body() body: AdminUpdateSubscriptionDto) {
    return this.earlyAccessService.updateSubscriptionStatus(body);
  }
}
