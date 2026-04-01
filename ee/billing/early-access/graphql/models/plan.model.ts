import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PlanLimitsModel {
  @Field(() => Int, { nullable: true })
  row_versions: number | null;

  @Field(() => Int, { nullable: true })
  projects: number | null;

  @Field(() => Int, { nullable: true })
  seats: number | null;

  @Field(() => Float, { nullable: true })
  storage_bytes: number | null;

  @Field(() => Int, { nullable: true })
  api_calls_per_day: number | null;
}

@ObjectType()
export class PlanModel {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  isPublic: boolean;

  @Field(() => Float)
  monthlyPriceUsd: number;

  @Field(() => Float)
  yearlyPriceUsd: number;

  @Field(() => PlanLimitsModel)
  limits: PlanLimitsModel;
}
