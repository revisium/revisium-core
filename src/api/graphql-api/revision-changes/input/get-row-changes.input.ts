import { Field, InputType, Int } from '@nestjs/graphql';
import { RowChangesFiltersInput } from './row-changes-filters.input';

@InputType()
export class GetRowChangesInput {
  @Field()
  revisionId: string;

  @Field({ nullable: true })
  compareWithRevisionId?: string;

  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;

  @Field(() => RowChangesFiltersInput, { nullable: true })
  filters?: RowChangesFiltersInput;
}
