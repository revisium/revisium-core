import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class PlanLimitsModel {
  @Field(() => Int, { nullable: true })
  rowVersions: number | null;

  @Field(() => Int, { nullable: true })
  projects: number | null;

  @Field(() => Int, { nullable: true })
  seats: number | null;

  @Field(() => Float, { nullable: true })
  storageBytes: number | null;

  @Field(() => Int, { nullable: true })
  apiCallsPerDay: number | null;
}

@ObjectType()
export class PlanModel {
  @Field(() => ID)
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

  @Field(() => GraphQLJSON)
  features: Record<string, boolean>;
}
