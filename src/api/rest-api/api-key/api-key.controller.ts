import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiParam,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CreatePersonalApiKeyDto } from 'src/api/rest-api/api-key/dto/create-personal-api-key.dto';
import { ApiKeyModel } from 'src/api/rest-api/api-key/model/api-key.model';
import { ApiKeyWithSecretModel } from 'src/api/rest-api/api-key/model/api-key-with-secret.model';
import { toApiKeyModel } from 'src/api/rest-api/api-key/api-key.mapper';
import { ApiCommonErrors } from 'src/api/rest-api/share/decorators';
import { ApiKeyApiService } from 'src/features/api-key/api-key-api.service';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { IAuthUser } from 'src/features/auth/types';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';

@UseInterceptors(RestMetricsInterceptor)
@UseGuards(HttpJwtAuthGuard)
@ApiTags('ApiKey')
@ApiBearerAuth('access-token')
@ApiSecurity('api-key')
@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyApiService: ApiKeyApiService) {}

  @Post('personal')
  @ApiOperation({
    operationId: 'createPersonalApiKey',
    summary: 'Create a personal API key for the current user',
    description:
      'Returns the plaintext secret only on this response. ' +
      'Store it now — it cannot be retrieved later.',
  })
  @ApiCreatedResponse({ type: ApiKeyWithSecretModel })
  @ApiCommonErrors()
  async createPersonalApiKey(
    @Body() data: CreatePersonalApiKeyDto,
    @Request() req: { user: IAuthUser },
  ): Promise<ApiKeyWithSecretModel> {
    const result = await this.apiKeyApiService.createPersonalApiKey({
      ...data,
      userId: req.user.userId,
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

  @Get('personal')
  @ApiOperation({
    operationId: 'myApiKeys',
    summary: "List the current user's personal API keys",
  })
  @ApiOkResponse({ type: ApiKeyModel, isArray: true })
  @ApiCommonErrors()
  async myApiKeys(@Request() req: { user: IAuthUser }): Promise<ApiKeyModel[]> {
    const keys = await this.apiKeyApiService.getMyApiKeys(req.user.userId);
    return keys.map((key) => toApiKeyModel(key));
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'API key identifier' })
  @ApiOperation({
    operationId: 'apiKeyById',
    summary: 'Read one API key visible to the current user',
  })
  @ApiOkResponse({ type: ApiKeyModel })
  @ApiCommonErrors()
  async apiKeyById(
    @Param('id') id: string,
    @Request() req: { user: IAuthUser },
  ): Promise<ApiKeyModel> {
    const apiKey = await this.apiKeyApiService.getApiKeyById(
      id,
      req.user.userId,
    );
    return toApiKeyModel(apiKey);
  }

  @Post(':id/rotate')
  @ApiParam({ name: 'id', description: 'API key identifier' })
  @ApiOperation({
    operationId: 'rotateApiKey',
    summary: 'Rotate a key — revokes the original and returns a new secret',
    description:
      'Atomically revokes the original key and creates a replacement with ' +
      'the same scope. The new plaintext secret is returned only on this ' +
      'response.',
  })
  @ApiCreatedResponse({ type: ApiKeyWithSecretModel })
  @ApiCommonErrors()
  async rotateApiKey(
    @Param('id') id: string,
    @Request() req: { user: IAuthUser },
  ): Promise<ApiKeyWithSecretModel> {
    const result = await this.apiKeyApiService.rotateApiKey(
      id,
      req.user.userId,
    );

    const apiKey = await this.apiKeyApiService.getApiKeyById(
      result.id,
      req.user.userId,
    );

    return {
      apiKey: toApiKeyModel(apiKey),
      secret: result.key,
    };
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'API key identifier' })
  @ApiOperation({
    operationId: 'revokeApiKey',
    summary: 'Revoke a key',
    description:
      'Sets `revokedAt` on the key. The record is preserved for audit; ' +
      'subsequent authentication attempts with this key are rejected.',
  })
  @ApiOkResponse({ type: ApiKeyModel })
  @ApiCommonErrors()
  async revokeApiKey(
    @Param('id') id: string,
    @Request() req: { user: IAuthUser },
  ): Promise<ApiKeyModel> {
    await this.apiKeyApiService.revokeApiKey(id, req.user.userId);
    const apiKey = await this.apiKeyApiService.getApiKeyById(
      id,
      req.user.userId,
    );
    return toApiKeyModel(apiKey);
  }
}
