import { ApiProperty } from '@nestjs/swagger';
import { EndpointType } from 'src/__generated__/client';

export class CreateEndpointDto {
  @ApiProperty({ enum: EndpointType })
  type: EndpointType;
}
