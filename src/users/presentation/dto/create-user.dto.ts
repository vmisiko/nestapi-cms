import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../domain/user';

export class CreateUserDto {
  @ApiProperty({ example: 'staff@citymega.org' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StaffPass@1', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.STAFF })
  @IsEnum(UserRole)
  role: UserRole;
}
