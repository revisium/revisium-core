import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsString } from 'class-validator';

export class RemoveRowsDto {
  @ApiProperty({ type: [String], maxItems: 1000 })
  @ArrayNotEmpty({ message: 'rowIds array cannot be empty' })
  @ArrayMaxSize(1000, { message: 'rowIds array cannot exceed 1000 items' })
  @IsString({ each: true })
  rowIds: string[];
}
