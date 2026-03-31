import { ApiProperty } from '@nestjs/swagger';
import { BillingStatus } from 'src/__generated__/client';

export class AdminUpdateSubscriptionDto {
  @ApiProperty()
  organizationId: string;

  @ApiProperty({
    required: false,
    enum: ['free', 'early_adopter', 'active', 'past_due', 'cancelled'],
  })
  status?: BillingStatus;

  @ApiProperty({ required: false, example: 'pro' })
  planId?: string;
}
