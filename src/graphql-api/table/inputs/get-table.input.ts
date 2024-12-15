import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class GetTableInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;
}
