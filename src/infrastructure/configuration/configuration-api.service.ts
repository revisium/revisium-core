import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  GetConfigurationQuery,
  GetConfigurationQueryReturnType,
} from 'src/infrastructure/configuration/queries/impl';

@Injectable()
export class ConfigurationApiService {
  constructor(private readonly queryBus: QueryBus) {}

  public getConfiguration() {
    return this.queryBus.execute<
      GetConfigurationQuery,
      GetConfigurationQueryReturnType
    >(new GetConfigurationQuery());
  }
}
