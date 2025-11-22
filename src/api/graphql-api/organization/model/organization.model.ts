import { Field, ObjectType } from '@nestjs/graphql';
import { UsersOrganizationModel } from 'src/api/graphql-api/organization/model/users-organization.model';

@ObjectType()
export class OrganizationModel {
  @Field()
  id: string;

  @Field()
  createdId: string;

  @Field(() => UsersOrganizationModel, { nullable: true })
  userOrganization?: UsersOrganizationModel;
}
