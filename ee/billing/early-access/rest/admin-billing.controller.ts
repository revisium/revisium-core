import {
  Body,
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeController,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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
@ApiExcludeController()
@Controller('api/admin/billing')
@ApiBearerAuth('access-token')
@ApiTags('Admin Billing')
export class AdminBillingController {
  constructor(private readonly earlyAccessService: EarlyAccessService) {}

  @Post('early-access')
  @ApiOperation({
    operationId: 'adminActivateEarlyAccess',
    summary: 'Activate early access for an organization (admin)',
  })
  async activateEarlyAccess(@Body() body: AdminUpdateSubscriptionDto) {
    return this.earlyAccessService.activateEarlyAccess(
      body.organizationId,
      body.planId ?? 'pro',
    );
  }
}
