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
  @ApiProperty({ enum: PatchRowOp, example: 'replace' })
  @IsEnum(PatchRowOp)
  op: PatchRowOp;

  @ApiProperty({ example: '/name' })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiProperty({ example: 'New Value' })
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
