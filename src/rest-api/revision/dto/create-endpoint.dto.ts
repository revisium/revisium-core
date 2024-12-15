import { ApiProperty } from '@nestjs/swagger';
import { EndpointType } from '@prisma/client';

export class CreateEndpointDto {
  @ApiProperty({ enum: EndpointType })
  type: EndpointType;
}
