import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RenameTableInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;

  @Field()
  nextTableId: string;
}
