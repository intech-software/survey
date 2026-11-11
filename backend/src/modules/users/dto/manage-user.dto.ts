import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PASSWORD_POLICY_REGEX } from './change-password.dto';

export const USER_STATUSES = ['active', 'inactive'] as const;

const PASSWORD_MESSAGE =
  'password must contain upper case, lower case, a digit and a special character (!@#$%^&*)';
const USERNAME_REGEX = /^[A-Za-z0-9._-]+$/;
const USERNAME_MESSAGE =
  'username may only contain letters, digits, dot, underscore and hyphen';

export class CreateUserDto {
  @ApiProperty({ example: 'nguyen.van.a' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(USERNAME_REGEX, { message: USERNAME_MESSAGE })
  username!: string;

  @ApiProperty({
    format: 'password',
    writeOnly: true,
    description:
      'Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt (!@#$%^&*)',
  })
  @IsString()
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_MESSAGE })
  password!: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'nguyen.van.a@example.com', nullable: true })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null && value !== '')
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ enum: USER_STATUSES, default: 'active' })
  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: (typeof USER_STATUSES)[number];
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'nguyen.van.a' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(USERNAME_REGEX, { message: USERNAME_MESSAGE })
  username?: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null && value !== '')
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ enum: USER_STATUSES })
  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: (typeof USER_STATUSES)[number];

  @ApiPropertyOptional({
    format: 'password',
    writeOnly: true,
    description: 'Đặt lại mật khẩu (bỏ trống nếu không đổi)',
  })
  @IsOptional()
  @IsString()
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_MESSAGE })
  password?: string;
}
