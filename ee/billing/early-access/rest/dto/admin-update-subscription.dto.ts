import { ApiProperty } from '@nestjs/swagger';

export class AdminUpdateSubscriptionDto {
  @ApiProperty()
  organizationId: string;

  @ApiProperty({ required: false, example: 'pro' })
  planId?: string;
}
