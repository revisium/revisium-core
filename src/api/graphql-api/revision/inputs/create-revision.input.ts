import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateRevisionInput {
  @Field()
  organizationId: string;

  @Field()
  projectName: string;

  @Field()
  branchName: string;

  @Field({ nullable: true })
  comment?: string;
}
