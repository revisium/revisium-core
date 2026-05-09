import { ApiProperty } from '@nestjs/swagger';
import { ApiKeyType } from 'src/__generated__/client';

export class ApiKeyModel {
  @ApiProperty()
  id: string;

  @ApiProperty()
  prefix: string;

  @ApiProperty({ enum: ApiKeyType, enumName: 'ApiKeyType' })
  type: ApiKeyType;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  organizationId?: string | null;

  @ApiProperty({ type: [String] })
  projectIds: string[];

  @ApiProperty({ type: [String] })
  branchNames: string[];

  @ApiProperty({ type: [String] })
  tableIds: string[];

  @ApiProperty()
  readOnly: boolean;

  @ApiProperty({ type: [String] })
  allowedIps: string[];

  @ApiProperty({
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  permissions: unknown;

  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
    format: 'date-time',
  })
  expiresAt?: Date | null;

  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
    format: 'date-time',
  })
  lastUsedAt?: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
    format: 'date-time',
  })
  revokedAt?: Date | null;
}
