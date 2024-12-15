import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveTableInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;
}
