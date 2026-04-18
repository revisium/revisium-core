import { UseGuards } from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Prisma } from 'src/__generated__/client';
import { ApiKeyWithSecretModel } from 'src/api/graphql-api/api-key/model/api-key-with-secret.model';
import { ApiKeyModel } from 'src/api/graphql-api/api-key/model/api-key.model';
import { ProjectModel } from 'src/api/graphql-api/project/model/project.model';
import { CreatePersonalApiKeyInput } from 'src/api/graphql-api/api-key/inputs/create-personal-api-key.input';
import { CreateServiceApiKeyInput } from 'src/api/graphql-api/api-key/inputs/create-service-api-key.input';
import { CurrentUser } from 'src/api/graphql-api/current-user.decorator';
import { ApiKeyApiService } from 'src/features/api-key/api-key-api.service';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { IAuthUser } from 'src/features/auth/types';
import { ProjectApiService } from 'src/features/project/project-api.service';

@UseGuards(GqlJwtAuthGuard)
@Resolver(() => ApiKeyModel)
export class ApiKeyResolver {
  constructor(
    private readonly apiKeyApiService: ApiKeyApiService,
    private readonly projectApi: ProjectApiService,
  ) {}

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

  @Mutation(() => ApiKeyWithSecretModel)
  async createServiceApiKey(
    @Args('data') data: CreateServiceApiKeyInput,
    @CurrentUser() user: IAuthUser,
  ): Promise<ApiKeyWithSecretModel> {
    const result = await this.apiKeyApiService.createServiceApiKey({
      ...data,
      userId: user.userId,
      permissions: data.permissions as unknown as Prisma.InputJsonValue,
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

  @Query(() => [ApiKeyModel])
  async serviceApiKeys(
    @Args('organizationId') organizationId: string,
    @CurrentUser() user: IAuthUser,
  ): Promise<ApiKeyModel[]> {
    const keys = await this.apiKeyApiService.getServiceApiKeys(
      organizationId,
      user.userId,
    );
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

  @ResolveField(() => [ProjectModel])
  async projects(@Parent() apiKey: ApiKeyModel): Promise<ProjectModel[]> {
    if (apiKey.projectIds.length === 0) {
      return [];
    }
    return this.projectApi.getProjectsByIds({
      projectIds: apiKey.projectIds,
    }) as unknown as Promise<ProjectModel[]>;
  }
}
