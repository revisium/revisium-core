import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { findConstraint } from 'src/api/rest-api/table/dto/__tests__/utils';
import { DateTimeFilterDto } from '../row/datetime-filter.dto';

describe('DateTimeFilterDto', () => {
  it('should pass with valid ISO equals', async () => {
    const dto = plainToInstance(DateTimeFilterDto, {
      equals: '2025-05-25T12:00:00Z',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when equals is not ISO string', async () => {
    const dto = plainToInstance(DateTimeFilterDto, {
      equals: 'not-a-date',
    });
    const errors = await validate(dto);
    expect(findConstraint(errors, 'equals', 'isDateString')).toBeDefined();
  });

  it('should pass with in array of ISO strings', async () => {
    const dto = plainToInstance(DateTimeFilterDto, {
      in: ['2025-01-01T00:00:00Z', '2025-02-02T00:00:00Z'],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when in contains invalid date', async () => {
    const dto = plainToInstance(DateTimeFilterDto, {
      in: ['2025-01-01T00:00:00Z', 'bad-date' as any],
    });
    const errors = await validate(dto);
    expect(findConstraint(errors, 'in', 'isDateString')).toBeDefined();
  });

  it('should pass with notIn array of ISO strings', async () => {
    const dto = plainToInstance(DateTimeFilterDto, {
      notIn: ['2025-03-03T00:00:00Z'],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when notIn contains invalid date', async () => {
    const dto = plainToInstance(DateTimeFilterDto, {
      notIn: ['also-bad' as any],
    });
    const errors = await validate(dto);
    expect(findConstraint(errors, 'notIn', 'isDateString')).toBeDefined();
  });

  it('should pass with lt/lte/gt/gte valid ISO strings', async () => {
    const dto = plainToInstance(DateTimeFilterDto, {
      lt: '2025-04-04T04:00:00Z',
      lte: '2025-05-05T05:00:00Z',
      gt: '2025-06-06T06:00:00Z',
      gte: '2025-07-07T07:00:00Z',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
