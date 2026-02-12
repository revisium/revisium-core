import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { TransformOptionalBoolean } from '../transform-optional-boolean.decorator';

class TestDto {
  @IsOptional()
  @TransformOptionalBoolean()
  @IsBoolean()
  value?: boolean;
}

describe('TransformOptionalBoolean', () => {
  const transform = (plain: Record<string, unknown>) =>
    plainToInstance(TestDto, plain);

  describe('valid inputs', () => {
    it('should convert string "true" to boolean true', async () => {
      const dto = transform({ value: 'true' });
      expect(dto.value).toBe(true);
      expect(await validate(dto)).toHaveLength(0);
    });

    it('should convert string "false" to boolean false', async () => {
      const dto = transform({ value: 'false' });
      expect(dto.value).toBe(false);
      expect(await validate(dto)).toHaveLength(0);
    });

    it('should keep boolean true as true', async () => {
      const dto = transform({ value: true });
      expect(dto.value).toBe(true);
      expect(await validate(dto)).toHaveLength(0);
    });

    it('should keep boolean false as false', async () => {
      const dto = transform({ value: false });
      expect(dto.value).toBe(false);
      expect(await validate(dto)).toHaveLength(0);
    });

    it('should preserve undefined when value is omitted', async () => {
      const dto = transform({});
      expect(dto.value).toBeUndefined();
      expect(await validate(dto)).toHaveLength(0);
    });
  });

  describe('invalid inputs', () => {
    it('should fail validation for arbitrary string', async () => {
      const dto = transform({ value: 'abc' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('value');
    });

    it('should fail validation for number', async () => {
      const dto = transform({ value: 123 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('value');
    });
  });
});
