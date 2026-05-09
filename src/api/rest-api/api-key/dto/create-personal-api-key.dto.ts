import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BaseApiKeyScopeDto } from 'src/api/rest-api/api-key/dto/base-api-key-scope.dto';

export class CreatePersonalApiKeyDto extends BaseApiKeyScopeDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
