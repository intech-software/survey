import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Tên đăng nhập' })
  username!: string;

  @ApiProperty({
    example: 'password',
    format: 'password',
    writeOnly: true,
  })
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token nhận được khi đăng nhập' })
  refreshToken!: string;
}

export class TokenPairResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken!: string;

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken!: string;
}

export class AccessTokenResponseDto {
  @ApiProperty({ description: 'JWT access token mới' })
  accessToken!: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message!: string;
}
