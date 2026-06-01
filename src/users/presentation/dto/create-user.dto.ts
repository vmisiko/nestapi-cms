import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../domain/user';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}
