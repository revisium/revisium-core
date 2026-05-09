import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BaseApiKeyScopeDto } from 'src/api/rest-api/api-key/dto/base-api-key-scope.dto';

export class CaslRuleDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  action: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  subject: string[];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  inverted?: boolean;
}

export class CaslPermissionsDto {
  @ApiProperty({ type: [CaslRuleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CaslRuleDto)
  rules: CaslRuleDto[];
}

export class CreateServiceApiKeyDto extends BaseApiKeyScopeDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ type: () => CaslPermissionsDto })
  @ValidateNested()
  @Type(() => CaslPermissionsDto)
  permissions: CaslPermissionsDto;
}
