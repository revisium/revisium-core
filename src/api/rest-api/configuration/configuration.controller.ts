import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigurationApiService } from 'src/infrastructure/configuration/configuration-api.service';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import { ConfigurationResponse } from 'src/api/rest-api/configuration/model';

@UseInterceptors(RestMetricsInterceptor)
@ApiTags('Configuration')
@Controller('configuration')
export class ConfigurationController {
  constructor(
    private readonly configurationApiService: ConfigurationApiService,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'getConfiguration' })
  @ApiOkResponse({ type: ConfigurationResponse })
  configuration(): Promise<ConfigurationResponse> {
    return this.configurationApiService.getConfiguration();
  }
}
