import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ViewColumnModel {
  @Field()
  field: string;

  @Field(() => Float, { nullable: true })
  width?: number;
}
