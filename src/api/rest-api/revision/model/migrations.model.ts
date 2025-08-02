import { ApiProperty } from '@nestjs/swagger';
import { JsonPatch } from 'src/features/share/utils/schema/types/json-patch.types';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

export class InitMigrationDto {
  @ApiProperty({
    enum: ['init'],
    example: 'init',
    description: 'Indicates an initialization migration',
  })
  changeType: 'init';

  @ApiProperty({ description: 'Identifier of the newly created table' })
  tableId: string;

  @ApiProperty({ description: 'Checksum of the initial schema' })
  hash: string;

  @ApiProperty({
    description: 'Timestamp when the table was created (ISO 8601)',
    example: '2025-07-31T12:34:56Z',
  })
  date: string;

  @ApiProperty({
    description: 'JSON Schema definition of the table',
    type: Object,
  })
  schema: JsonSchema;
}

export class UpdateMigrationDto {
  @ApiProperty({
    enum: ['update'],
    example: 'update',
    description: 'Indicates an update migration',
  })
  changeType: 'update';

  @ApiProperty({ description: 'Identifier of the table' })
  tableId: string;

  @ApiProperty({ description: 'Checksum of the patch set' })
  hash: string;

  @ApiProperty({
    description: 'Timestamp when the update was applied (ISO 8601)',
  })
  date: string;

  @ApiProperty({
    description: 'Array of JSON Patch operations',
    type: [Object],
  })
  patches: JsonPatch[];
}

export class RenameMigrationDto {
  @ApiProperty({
    enum: ['rename'],
    example: 'rename',
    description: 'Indicates a rename migration',
  })
  changeType: 'rename';

  @ApiProperty({
    description: 'Timestamp when the table was renamed (ISO 8601)',
  })
  date: string;

  @ApiProperty({ description: 'New table identifier after renaming' })
  tableId: string;
}
