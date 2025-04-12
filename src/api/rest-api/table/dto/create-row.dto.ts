import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class CreateRowDto {
  @ApiProperty()
  rowId: string;

  @ApiProperty({ type: 'object', additionalProperties: false })
  data: Prisma.InputJsonValue;
}
