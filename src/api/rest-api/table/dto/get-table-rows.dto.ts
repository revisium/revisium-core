import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderByDto } from 'src/api/rest-api/share/model/order-by.model';
import { IsUniqueOrderByFields } from 'src/api/rest-api/share/validators/is-unique-order-by-fields.validator';
import { RowWhereInputDto } from 'src/api/rest-api/table/dto/row/row-where-input.dto';

export class GetTableRowsDto {
  @ApiProperty({ default: 100 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  first: number;

  @ApiProperty({ required: false, example: '' })
  @IsOptional()
  @IsString()
  after?: string;

  @ApiPropertyOptional({
    description: 'Array of sorting criteria',
    type: [OrderByDto],
    example: [{ field: 'id', direction: 'asc' }],
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        throw new BadRequestException('`orderBy` must be valid JSON array');
      }
    }
    return value;
  })
  @IsOptional()
  @ArrayNotEmpty({ message: '`orderBy` should not be an empty array' })
  @ValidateNested({ each: true })
  @Type(() => OrderByDto)
  @IsUniqueOrderByFields({ message: 'Each orderBy.field must be unique' })
  orderBy?: OrderByDto[];

  @ApiPropertyOptional({
    description: 'Row filtering conditions',
    type: RowWhereInputDto,
  })
  @ValidateNested()
  @Type(() => RowWhereInputDto)
  @IsOptional()
  where?: RowWhereInputDto;
}
