import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteProjectInput {
  @Field()
  organizationId: string;

  @Field()
  projectName: string;
}
