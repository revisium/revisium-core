import { Query, Resolver } from '@nestjs/graphql';
import { ConfigurationApiService } from 'src/infrastructure/configuration/configuration-api.service';
import { ConfigurationModel } from 'src/api/graphql-api/configuration/model';

@Resolver(() => ConfigurationModel)
export class ConfigurationResolver {
  constructor(
    private readonly configurationApiService: ConfigurationApiService,
  ) {}

  @Query(() => ConfigurationModel)
  configuration(): Promise<ConfigurationModel> {
    return this.configurationApiService.getConfiguration();
  }
}
