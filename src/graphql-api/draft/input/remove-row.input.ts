import { InputType } from '@nestjs/graphql';
import { GetRowInput } from 'src/graphql-api/row/inputs/get-row.input';

@InputType()
export class RemoveRowInput extends GetRowInput {}
