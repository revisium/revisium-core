import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class GetTableViewsInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;
}
