import { ApiProperty } from '@nestjs/swagger';
import { ApiKeyModel } from 'src/api/rest-api/api-key/model/api-key.model';

export class ApiKeyWithSecretModel {
  @ApiProperty({ type: () => ApiKeyModel })
  apiKey: ApiKeyModel;

  @ApiProperty({
    description:
      'Plaintext secret. Returned only once at creation/rotation — store it now or rotate.',
  })
  secret: string;
}
