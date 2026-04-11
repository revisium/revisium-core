import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

@InputType()
export class LoginInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(320)
  emailOrUsername: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  password: string;
}
