import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PlanModel {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  isPublic: boolean;

  @Field(() => Int)
  sortOrder: number;

  @Field(() => Int, { nullable: true })
  maxRowVersions: number | null;

  @Field(() => Int, { nullable: true })
  maxProjects: number | null;

  @Field(() => Int, { nullable: true })
  maxSeats: number | null;

  @Field(() => Float, { nullable: true })
  maxStorageBytes: number | null;

  @Field(() => Int, { nullable: true })
  maxApiCallsPerDay: number | null;

  @Field(() => Float)
  monthlyPriceUsd: number;

  @Field(() => Float)
  yearlyPriceUsd: number;
}
