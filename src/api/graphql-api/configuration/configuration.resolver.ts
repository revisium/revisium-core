import { QueryBus } from '@nestjs/cqrs';
import { Query, Resolver } from '@nestjs/graphql';
import {
  GetConfigurationQuery,
  GetConfigurationQueryReturnType,
} from 'src/infrastructure/configuration/queries/impl';
import { ConfigurationModel } from 'src/api/graphql-api/configuration/model';

@Resolver(() => ConfigurationModel)
export class ConfigurationResolver {
  constructor(private readonly queryBus: QueryBus) {}

  @Query(() => ConfigurationModel)
  configuration(): Promise<ConfigurationModel> {
    return this.queryBus.execute<
      GetConfigurationQuery,
      GetConfigurationQueryReturnType
    >(new GetConfigurationQuery());
  }
}
