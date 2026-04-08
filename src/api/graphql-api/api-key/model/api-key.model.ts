import { Field, ID, ObjectType } from '@nestjs/graphql';
import { DateTimeResolver, GraphQLJSON } from 'graphql-scalars';
import { ApiKeyTypeEnum } from 'src/api/graphql-api/api-key/model/api-key-type.enum';
import { ProjectModel } from 'src/api/graphql-api/project/model/project.model';
import { Relation } from 'src/api/graphql-api/share/model/relation.type';

@ObjectType()
export class ApiKeyModel {
  @Field(() => ID)
  id: string;

  @Field()
  prefix: string;

  @Field(() => ApiKeyTypeEnum)
  type: ApiKeyTypeEnum;

  @Field()
  name: string;

  @Field({ nullable: true })
  organizationId?: string;

  @Field(() => [String])
  projectIds: string[];

  @Field(() => [ProjectModel])
  projects: Relation<ProjectModel[]>;

  @Field(() => [String])
  branchNames: string[];

  @Field(() => [String])
  tableIds: string[];

  @Field()
  readOnly: boolean;

  @Field(() => [String])
  allowedIps: string[];

  @Field(() => GraphQLJSON, { nullable: true })
  permissions?: unknown;

  @Field(() => DateTimeResolver, { nullable: true })
  expiresAt?: Date;

  @Field(() => DateTimeResolver, { nullable: true })
  lastUsedAt?: Date;

  @Field(() => DateTimeResolver)
  createdAt: Date;

  @Field(() => DateTimeResolver, { nullable: true })
  revokedAt?: Date;
}
