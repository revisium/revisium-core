import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class GetRowCountForeignKeysByInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;

  @Field()
  rowId: string;
}
