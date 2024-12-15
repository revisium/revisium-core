import { ApiProperty } from '@nestjs/swagger';

class GoogleOauth {
  @ApiProperty({ type: Boolean })
  available: boolean;

  @ApiProperty({ required: false })
  clientId?: string;
}

class GithubOauth {
  @ApiProperty({ type: Boolean })
  available: boolean;

  @ApiProperty({ required: false })
  clientId?: string;
}

export class ConfigurationResponse {
  @ApiProperty({ type: Boolean })
  availableEmailSignUp: boolean;

  @ApiProperty({ type: GoogleOauth })
  google: GoogleOauth;

  @ApiProperty({ type: GithubOauth })
  github: GithubOauth;
}
