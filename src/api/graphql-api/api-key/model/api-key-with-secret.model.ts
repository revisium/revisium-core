import { Field, ObjectType } from '@nestjs/graphql';
import { ApiKeyModel } from 'src/api/graphql-api/api-key/model/api-key.model';

@ObjectType()
export class ApiKeyWithSecretModel {
  @Field(() => ApiKeyModel)
  apiKey: ApiKeyModel;

  @Field()
  secret: string;
}
