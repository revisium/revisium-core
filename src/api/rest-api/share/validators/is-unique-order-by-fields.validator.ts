import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { OrderByDto } from 'src/api/rest-api/share/model/order-by.model';

export function IsUniqueOrderByFields(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUniqueOrderByFields',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: OrderByDto[]): boolean {
          if (!Array.isArray(value)) return false;

          const seen = new Set();
          for (const item of value) {
            if (seen.has(item.field)) return false;
            seen.add(item.field);
          }
          return true;
        },
        defaultMessage(args: ValidationArguments): string {
          return 'Each orderBy.field must be unique';
        },
      },
    });
  };
}
