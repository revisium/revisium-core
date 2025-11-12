import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { JsonValue } from '@revisium/schema-toolkit/types';

export enum PatchRowOp {
  replace = 'replace',
}

export class PatchRow {
  @ApiProperty({
    enum: PatchRowOp,
    example: 'replace',
    description:
      'The operation to perform. Currently only "replace" is supported',
  })
  @IsEnum(PatchRowOp)
  op: PatchRowOp;

  @ApiProperty({
    example: 'list[0].nestedList[2].name',
    description:
      'JSON path using dot notation for objects and [index] for arrays. Examples: "name", "user.email", "items[0]", "data.list[2].value"',
  })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiProperty({
    description:
      'The value to set at the specified path. Can be any valid JSON value (string, number, boolean, object, array, or null)',
    oneOf: [
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'object' },
      { type: 'array' },
      { type: 'null' },
    ],
    example: '{ key: "value" }',
  })
  @IsDefined()
  value: JsonValue;
}

export class PatchRowDto {
  @ApiProperty({ type: [PatchRow] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatchRow)
  patches: PatchRow[];
}
