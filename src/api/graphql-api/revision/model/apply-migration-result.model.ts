import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum ApplyMigrationStatus {
  applied = 'applied',
  skipped = 'skipped',
  failed = 'failed',
}

registerEnumType(ApplyMigrationStatus, {
  name: 'ApplyMigrationStatus',
  description: 'Status of migration application',
});

@ObjectType()
export class ApplyMigrationResultModel {
  @Field()
  id: string;

  @Field(() => ApplyMigrationStatus)
  status: ApplyMigrationStatus;

  @Field({ nullable: true })
  error?: string;
}
