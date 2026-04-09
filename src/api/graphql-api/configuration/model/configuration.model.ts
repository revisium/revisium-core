import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GoogleOauth {
  @Field(() => Boolean)
  available: boolean;

  @Field({ nullable: true })
  clientId?: string;
}

@ObjectType()
export class GithubOauth {
  @Field(() => Boolean)
  available: boolean;

  @Field({ nullable: true })
  clientId?: string;
}

@ObjectType()
export class CacheConfigModel {
  @Field(() => Boolean)
  enabled: boolean;
}

@ObjectType()
export class PluginsModel {
  @Field(() => Boolean)
  file: boolean;
}

@ObjectType()
export class ConfigurationModel {
  @Field(() => Boolean)
  availableEmailSignUp: boolean;

  @Field(() => Boolean)
  noAuth: boolean;

  @Field(() => GoogleOauth)
  google: GoogleOauth;

  @Field(() => GithubOauth)
  github: GithubOauth;

  @Field(() => CacheConfigModel)
  cache: CacheConfigModel;

  @Field(() => PluginsModel)
  plugins: PluginsModel;
}
