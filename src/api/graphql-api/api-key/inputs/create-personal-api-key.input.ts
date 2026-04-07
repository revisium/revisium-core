import { Field, InputType } from '@nestjs/graphql';
import { BaseApiKeyScopeInput } from 'src/api/graphql-api/api-key/inputs/base-api-key-scope.input';

@InputType()
export class CreatePersonalApiKeyInput extends BaseApiKeyScopeInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  organizationId?: string;
}
