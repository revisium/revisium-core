import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class CreateTableDto {
  @ApiProperty()
  tableId: string;

  @ApiProperty({ type: 'object', additionalProperties: false })
  schema: Prisma.InputJsonValue;
}
