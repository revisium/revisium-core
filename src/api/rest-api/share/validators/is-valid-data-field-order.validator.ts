import { registerDecorator, ValidationOptions } from 'class-validator';
import {
  OrderByDto,
  SortField,
} from 'src/api/rest-api/share/model/order-by.model';

export function IsValidDataFieldOrder(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidDataFieldOrder',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: OrderByDto[]): boolean {
          if (!Array.isArray(value)) return true;

          for (const item of value) {
            if (item.field === SortField.data) {
              if (!item.path || !item.type) {
                return false;
              }
            }
          }
          return true;
        },
      },
    });
  };
}
