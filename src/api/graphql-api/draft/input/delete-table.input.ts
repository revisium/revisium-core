import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteTableInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;
}
