import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Prisma } from 'src/__generated__/client';
import { CreateServiceApiKeyDto } from 'src/api/rest-api/api-key/dto/create-service-api-key.dto';
import { ApiKeyModel } from 'src/api/rest-api/api-key/model/api-key.model';
import { ApiKeyWithSecretModel } from 'src/api/rest-api/api-key/model/api-key-with-secret.model';
import { toApiKeyModel } from 'src/api/rest-api/api-key/api-key.mapper';
import {
  ApiCommonErrors,
  ApiOrganizationIdParam,
} from 'src/api/rest-api/share/decorators';
import { ApiKeyApiService } from 'src/features/api-key/api-key-api.service';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { IAuthUser } from 'src/features/auth/types';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';

@UseInterceptors(RestMetricsInterceptor)
@UseGuards(HttpJwtAuthGuard)
@ApiTags('ApiKey')
@ApiBearerAuth('access-token')
@ApiSecurity('api-key')
@Controller('organization/:organizationId/api-keys')
export class ApiKeyServiceController {
  constructor(private readonly apiKeyApiService: ApiKeyApiService) {}

  @Post('service')
  @ApiOrganizationIdParam()
  @ApiOperation({
    operationId: 'createServiceApiKey',
    summary: 'Create a service API key for an organization',
    description:
      'Requires `manage` on `ApiKey` for the organization (scoped further ' +
      'to projects when `projectIds` is supplied). The plaintext secret is ' +
      'returned only on this response.',
  })
  @ApiCreatedResponse({ type: ApiKeyWithSecretModel })
  @ApiCommonErrors()
  async createServiceApiKey(
    @Param('organizationId') organizationId: string,
    @Body() data: CreateServiceApiKeyDto,
    @Request() req: { user: IAuthUser },
  ): Promise<ApiKeyWithSecretModel> {
    const result = await this.apiKeyApiService.createServiceApiKey({
      ...data,
      organizationId,
      userId: req.user.userId,
      permissions: data.permissions as unknown as Prisma.InputJsonValue,
    });

    const apiKey = await this.apiKeyApiService.getApiKeyById(
      result.id,
      req.user.userId,
    );

    return {
      apiKey: toApiKeyModel(apiKey),
      secret: result.key,
    };
  }

  @Get('service')
  @ApiOrganizationIdParam()
  @ApiOperation({
    operationId: 'serviceApiKeys',
    summary: 'List organization service API keys',
    description: 'Requires `manage` on `ApiKey` for the organization.',
  })
  @ApiOkResponse({ type: ApiKeyModel, isArray: true })
  @ApiCommonErrors()
  async serviceApiKeys(
    @Param('organizationId') organizationId: string,
    @Request() req: { user: IAuthUser },
  ): Promise<ApiKeyModel[]> {
    const keys = await this.apiKeyApiService.getServiceApiKeys(
      organizationId,
      req.user.userId,
    );
    return keys.map((key) => toApiKeyModel(key));
  }
}
