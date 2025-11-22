import { Field, ObjectType } from '@nestjs/graphql';
import { JSONResolver } from 'graphql-scalars';

@ObjectType()
export class PermissionModel {
  @Field()
  id: string;

  @Field()
  action: string;

  @Field()
  subject: string;

  @Field(() => JSONResolver, { nullable: true })
  condition?: Record<string, unknown>;
}
