import { InputType, Field } from '@nestjs/graphql';

export { InputType } from '@nestjs/graphql';

@InputType()
export class CreateBranchInput {
  @Field()
  name: string;
}
