import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class GetBranchInput {
  @Field()
  organizationId: string;

  @Field()
  projectName: string;

  @Field()
  branchName: string;
}
