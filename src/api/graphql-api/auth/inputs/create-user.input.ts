import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserSystemRoles } from 'src/features/auth/consts';

@InputType()
export class CreateUserInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username: string;

  @Field(() => UserSystemRoles)
  @IsEnum(UserSystemRoles)
  roleId: UserSystemRoles;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(256)
  password: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;
}
