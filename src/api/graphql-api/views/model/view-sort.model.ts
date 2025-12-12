import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ViewSortModel {
  @Field()
  field: string;

  @Field()
  direction: string;
}
