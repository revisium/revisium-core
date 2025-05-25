import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { findConstraint } from 'src/api/rest-api/table/dto/__tests__/utils';
import { BoolFilterDto } from '../row/bool-filter.dto';

describe('BoolFilterDto', () => {
  it('should pass with equals boolean', async () => {
    const dto = plainToInstance(BoolFilterDto, { equals: true });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when equals is not boolean', async () => {
    const dto = plainToInstance(BoolFilterDto, { equals: 'true' as any });
    const errors = await validate(dto);
    expect(findConstraint(errors, 'equals', 'isBoolean')).toBeDefined();
  });

  it('should pass with nested not filter', async () => {
    const dto = plainToInstance(BoolFilterDto, { not: { equals: false } });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
