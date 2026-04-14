import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UsageMetricModel {
  @Field(() => Float)
  current: number;

  @Field(() => Float, { nullable: true })
  limit: number | null;

  @Field(() => Float, { nullable: true })
  percentage: number | null;
}

@ObjectType()
export class UsageSummaryModel {
  @Field(() => UsageMetricModel)
  rowVersions: UsageMetricModel;

  @Field(() => UsageMetricModel)
  projects: UsageMetricModel;

  @Field(() => UsageMetricModel)
  seats: UsageMetricModel;

  @Field(() => UsageMetricModel)
  storageBytes: UsageMetricModel;

  @Field(() => UsageMetricModel)
  endpointsPerProject: UsageMetricModel;
}
