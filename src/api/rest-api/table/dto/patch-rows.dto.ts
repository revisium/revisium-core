import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PatchRow } from 'src/api/rest-api/row/dto/patch-row.dto';

export class PatchRowsRowDto {
  @ApiProperty()
  @IsString()
  rowId: string;

  @ApiProperty({ type: [PatchRow] })
  @IsArray()
  @ArrayNotEmpty({ message: 'patches array cannot be empty' })
  @ValidateNested({ each: true })
  @Type(() => PatchRow)
  patches: PatchRow[];
}

export class PatchRowsDto {
  @ApiProperty({ type: [PatchRowsRowDto], maxItems: 1000 })
  @ArrayNotEmpty({ message: 'rows array cannot be empty' })
  @ArrayMaxSize(1000, { message: 'rows array cannot exceed 1000 items' })
  @ValidateNested({ each: true })
  @Type(() => PatchRowsRowDto)
  rows: PatchRowsRowDto[];
}
