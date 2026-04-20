import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class ValidateProjectFileBytesInput {
  @Field(() => ID)
  projectId: string;
}

@InputType()
export class RestoreProjectFileBytesInput {
  @Field(() => ID)
  projectId: string;

  @Field({ defaultValue: true })
  dryRun: boolean;
}
