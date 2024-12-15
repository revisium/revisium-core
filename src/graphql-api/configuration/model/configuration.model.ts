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
export class ConfigurationModel {
  @Field(() => Boolean)
  availableEmailSignUp: boolean;

  @Field(() => GoogleOauth)
  google: GoogleOauth;

  @Field(() => GithubOauth)
  github: GithubOauth;
}
