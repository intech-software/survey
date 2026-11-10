import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'admin', description: 'Tên đăng nhập (2-50 ký tự)' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  username!: string;

  @ApiProperty({
    example: 'Admin@123',
    format: 'password',
    writeOnly: true,
    description: 'Mật khẩu (6-50 ký tự)',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password!: string;

  @ApiProperty({ example: 'Administrator', description: 'Họ tên hiển thị' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  name!: string;

  @ApiPropertyOptional({ example: 'admin@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
