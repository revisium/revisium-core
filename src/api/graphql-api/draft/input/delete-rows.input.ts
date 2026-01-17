import { Field, InputType } from '@nestjs/graphql';
import { ArrayMaxSize, ArrayNotEmpty, IsString } from 'class-validator';

@InputType()
export class DeleteRowsInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;

  @Field(() => [String])
  @ArrayNotEmpty({ message: 'rowIds array cannot be empty' })
  @ArrayMaxSize(1000, { message: 'rowIds array cannot exceed 1000 items' })
  @IsString({ each: true })
  rowIds: string[];
}
