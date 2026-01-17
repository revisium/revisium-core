import { Field, InputType } from '@nestjs/graphql';

export { InputType } from '@nestjs/graphql';

@InputType()
export class CreateBranchInput {
  @Field()
  revisionId: string;

  @Field()
  branchName: string;
}
