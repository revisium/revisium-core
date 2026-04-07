import { Field, InputType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-scalars';
import { BaseApiKeyScopeInput } from 'src/api/graphql-api/api-key/inputs/base-api-key-scope.input';

@InputType()
export class CaslRuleInput {
  @Field(() => [String])
  action: string[];

  @Field(() => [String])
  subject: string[];

  @Field(() => GraphQLJSONObject, { nullable: true })
  conditions?: Record<string, unknown>;

  @Field(() => [String], { nullable: true })
  fields?: string[];

  @Field({ nullable: true })
  inverted?: boolean;
}

@InputType()
export class CaslPermissionsInput {
  @Field(() => [CaslRuleInput])
  rules: CaslRuleInput[];
}

@InputType()
export class CreateServiceApiKeyInput extends BaseApiKeyScopeInput {
  @Field()
  name: string;

  @Field()
  organizationId: string;

  @Field(() => CaslPermissionsInput)
  permissions: CaslPermissionsInput;
}
