import { Field, InputType } from '@nestjs/graphql';
import { GetRowInput } from 'src/api/graphql-api/row/inputs/get-row.input';

@InputType()
export class RenameRowInput extends GetRowInput {
  @Field()
  nextRowId: string;
}
