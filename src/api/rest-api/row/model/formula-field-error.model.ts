import { ApiProperty } from '@nestjs/swagger';

export class FormulaFieldErrorModel {
  @ApiProperty({
    description: 'The field name where the formula error occurred',
    example: 'total',
  })
  field: string;

  @ApiProperty({
    description: 'The formula expression that failed',
    example: 'price * quantity',
  })
  expression: string;

  @ApiProperty({
    description: 'The error message describing what went wrong',
    example: 'Division by zero',
  })
  error: string;

  @ApiProperty({
    description:
      'Whether a default value was used instead of the computed result',
    example: true,
  })
  defaultUsed: boolean;
}
