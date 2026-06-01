import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@citymega.org' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin@123456', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
