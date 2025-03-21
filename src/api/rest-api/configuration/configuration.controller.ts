import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  GetConfigurationQuery,
  GetConfigurationQueryReturnType,
} from 'src/infrastructure/configuration/queries/impl';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import { ConfigurationResponse } from 'src/api/rest-api/configuration/model';

@UseInterceptors(RestMetricsInterceptor)
@ApiTags('Configuration')
@Controller('configuration')
export class ConfigurationController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ operationId: 'getConfiguration' })
  @ApiOkResponse({ type: ConfigurationResponse })
  configuration(): Promise<ConfigurationResponse> {
    return this.queryBus.execute<
      GetConfigurationQuery,
      GetConfigurationQueryReturnType
    >(new GetConfigurationQuery());
  }
}
