import { Field, InputType } from '@nestjs/graphql';
import { DateTimeResolver, GraphQLJSON } from 'graphql-scalars';

@InputType()
export class CaslRuleInput {
  @Field(() => [String])
  action: string[];

  @Field(() => [String])
  subject: string[];

  @Field(() => GraphQLJSON, { nullable: true })
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
export class CreateServiceApiKeyInput {
  @Field()
  name: string;

  @Field()
  organizationId: string;

  @Field(() => [String], { nullable: true })
  projectIds?: string[];

  @Field(() => [String], { nullable: true })
  branchNames?: string[];

  @Field(() => [String], { nullable: true })
  tableIds?: string[];

  @Field({ nullable: true, defaultValue: false })
  readOnly?: boolean;

  @Field(() => [String], { nullable: true })
  allowedIps?: string[];

  @Field(() => DateTimeResolver, { nullable: true })
  expiresAt?: Date;

  @Field(() => CaslPermissionsInput)
  permissions: CaslPermissionsInput;
}
