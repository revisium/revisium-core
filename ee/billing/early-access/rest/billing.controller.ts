import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiExcludeController,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { HTTPOrganizationGuard } from 'src/features/auth/guards/organization.guard';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import { EarlyAccessService } from '../early-access.service';
import { ActivateEarlyAccessDto } from './dto/activate-early-access.dto';

@UseInterceptors(RestMetricsInterceptor)
@ApiExcludeController()
@Controller('api/billing')
@ApiTags('Billing')
export class BillingController {
  constructor(
    private readonly earlyAccessService: EarlyAccessService,
    private readonly configService: ConfigService,
  ) {}

  private get isEarlyAccessEnabled(): boolean {
    return this.configService.get('EARLY_ACCESS_ENABLED') === 'true';
  }

  @Get('plans')
  @ApiOperation({ operationId: 'getPlans', summary: 'List available plans' })
  async getPlans() {
    const plans = await this.earlyAccessService.getPlans();
    return { plans, earlyAccess: this.isEarlyAccessEnabled };
  }

  @UseGuards(HttpJwtAuthGuard, HTTPOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.update,
    subject: PermissionSubject.Organization,
  })
  @Post(':organizationId/early-access')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    operationId: 'activateEarlyAccess',
    summary: 'Activate early access for an organization',
  })
  async activateEarlyAccess(
    @Param('organizationId') organizationId: string,
    @Body() body: ActivateEarlyAccessDto,
  ) {
    if (!this.isEarlyAccessEnabled) {
      throw new BadRequestException('Early access is not currently available');
    }
    return this.earlyAccessService.activateEarlyAccess(
      organizationId,
      body.planId,
    );
  }

  @UseGuards(HttpJwtAuthGuard, HTTPOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.read,
    subject: PermissionSubject.Organization,
  })
  @Get(':organizationId/subscription')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    operationId: 'getSubscription',
    summary: 'Get organization subscription',
  })
  async getSubscription(@Param('organizationId') organizationId: string) {
    return this.earlyAccessService.getOrgSubscription(organizationId);
  }

  @UseGuards(HttpJwtAuthGuard, HTTPOrganizationGuard)
  @PermissionParams({
    action: PermissionAction.read,
    subject: PermissionSubject.Organization,
  })
  @Get(':organizationId/usage')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    operationId: 'getUsage',
    summary: 'Get organization usage summary',
  })
  async getUsage(@Param('organizationId') organizationId: string) {
    return this.earlyAccessService.getOrgUsageSummary(organizationId);
  }
}
