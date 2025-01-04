import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class GetRowInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;

  @Field()
  rowId: string;
}
