import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class GetRowCountReferencesByInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;

  @Field()
  rowId: string;
}
