import { registerDecorator, ValidationOptions } from 'class-validator';
import {
  OrderByDto,
  SortField,
} from 'src/api/rest-api/share/model/order-by.model';

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

          const seen = new Set<string>();
          for (const item of value) {
            const key =
              item.field === SortField.data
                ? `${item.field}:${item.path || ''}`
                : item.field;

            if (seen.has(key)) return false;
            seen.add(key);
          }
          return true;
        },
      },
    });
  };
}
