import { Field, InputType, Int } from '@nestjs/graphql';
import { TableChangesFiltersInput } from './table-changes-filters.input';

@InputType()
export class GetTableChangesInput {
  @Field()
  revisionId: string;

  @Field({ nullable: true })
  compareWithRevisionId?: string;

  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;

  @Field(() => TableChangesFiltersInput, { nullable: true })
  filters?: TableChangesFiltersInput;
}
