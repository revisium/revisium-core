import { ApiProperty } from '@nestjs/swagger';
import { EndpointType } from '@prisma/client';

export class EndpointModel {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ enum: EndpointType })
  type: EndpointType;
}
