import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ApiKeyWithSecretModel } from 'src/api/graphql-api/api-key/model/api-key-with-secret.model';
import { ApiKeyModel } from 'src/api/graphql-api/api-key/model/api-key.model';
import { CreatePersonalApiKeyInput } from 'src/api/graphql-api/api-key/inputs';
import { CurrentUser } from 'src/api/graphql-api/current-user.decorator';
import { ApiKeyApiService } from 'src/features/api-key/api-key-api.service';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { IAuthUser } from 'src/features/auth/types';

@UseGuards(GqlJwtAuthGuard)
@Resolver()
export class ApiKeyResolver {
  constructor(private readonly apiKeyApiService: ApiKeyApiService) {}

  @Mutation(() => ApiKeyWithSecretModel)
  async createPersonalApiKey(
    @Args('data') data: CreatePersonalApiKeyInput,
    @CurrentUser() user: IAuthUser,
  ): Promise<ApiKeyWithSecretModel> {
    const result = await this.apiKeyApiService.createPersonalApiKey({
      ...data,
      userId: user.userId,
    });

    const apiKey = await this.apiKeyApiService.getApiKeyById(
      result.id,
      user.userId,
    );

    return {
      apiKey: apiKey as unknown as ApiKeyModel,
      secret: result.key,
    };
  }

  @Mutation(() => ApiKeyModel)
  async revokeApiKey(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: IAuthUser,
  ): Promise<ApiKeyModel> {
    await this.apiKeyApiService.revokeApiKey(id, user.userId);
    const apiKey = await this.apiKeyApiService.getApiKeyById(id, user.userId);
    return apiKey as unknown as ApiKeyModel;
  }

  @Mutation(() => ApiKeyWithSecretModel)
  async rotateApiKey(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: IAuthUser,
  ): Promise<ApiKeyWithSecretModel> {
    const result = await this.apiKeyApiService.rotateApiKey(id, user.userId);

    const apiKey = await this.apiKeyApiService.getApiKeyById(
      result.id,
      user.userId,
    );

    return {
      apiKey: apiKey as unknown as ApiKeyModel,
      secret: result.key,
    };
  }

  @Query(() => [ApiKeyModel])
  async myApiKeys(@CurrentUser() user: IAuthUser): Promise<ApiKeyModel[]> {
    const keys = await this.apiKeyApiService.getMyApiKeys(user.userId);
    return keys as unknown as ApiKeyModel[];
  }

  @Query(() => ApiKeyModel)
  async apiKeyById(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: IAuthUser,
  ): Promise<ApiKeyModel> {
    const apiKey = await this.apiKeyApiService.getApiKeyById(id, user.userId);
    return apiKey as unknown as ApiKeyModel;
  }
}
