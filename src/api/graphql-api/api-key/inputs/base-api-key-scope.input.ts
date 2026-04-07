import { Field, InputType } from '@nestjs/graphql';
import { DateTimeResolver } from 'graphql-scalars';

@InputType({ isAbstract: true })
export class BaseApiKeyScopeInput {
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
}
