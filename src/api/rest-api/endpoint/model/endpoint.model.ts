import { ApiProperty } from '@nestjs/swagger';
import { EndpointType } from 'src/__generated__/client';

export class EndpointModel {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ enum: EndpointType })
  type: EndpointType;
}
