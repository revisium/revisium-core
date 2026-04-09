import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CacheMetricModel {
  @Field()
  key: string;

  @Field(() => Int)
  hits: number;

  @Field(() => Int)
  misses: number;

  @Field(() => Int)
  writes: number;

  @Field(() => Int)
  deletes: number;

  @Field(() => Float)
  hitRate: number;
}

@ObjectType()
export class CacheStatsModel {
  @Field(() => Int)
  totalHits: number;

  @Field(() => Int)
  totalMisses: number;

  @Field(() => Int)
  totalWrites: number;

  @Field(() => Int)
  totalDeletes: number;

  @Field(() => Int)
  totalClears: number;

  @Field(() => Float)
  overallHitRate: number;

  @Field(() => [CacheMetricModel])
  byCategory: CacheMetricModel[];
}
