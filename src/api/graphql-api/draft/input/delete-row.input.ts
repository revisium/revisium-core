import { InputType } from '@nestjs/graphql';
import { GetRowInput } from 'src/api/graphql-api/row/inputs/get-row.input';

@InputType()
export class DeleteRowInput extends GetRowInput {}
