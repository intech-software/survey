import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LocalAuthGuard } from '../../guards/local-auth.guard';
import { AuthService } from './auth.service';
import {
  AccessTokenResponseDto,
  LoginDto,
  MessageResponseDto,
  RefreshTokenDto,
  TokenPairResponseDto,
} from './dto/swagger-auth.dto';

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đăng nhập, cấp access token và refresh token' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: TokenPairResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Tên đăng nhập hoặc mật khẩu không đúng',
  })
  login(@Request() request: { user: { id: number; username: string } }) {
    return this.authService.login(request.user);
  }

  @Post('refresh-token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cấp access token mới từ refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ type: AccessTokenResponseDto })
  @ApiBadRequestResponse({ description: 'Thiếu refresh token' })
  @ApiUnauthorizedResponse({
    description: 'Refresh token không hợp lệ hoặc đã hết hạn',
  })
  async refreshToken(@Body() body: RefreshTokenDto) {
    if (!body?.refreshToken) {
      throw new HttpException('Refresh token is required', 400);
    }
    const newToken = await this.authService.refreshToken(body.refreshToken);
    if (!newToken) {
      throw new HttpException('Invalid refresh token', 401);
    }
    return newToken;
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đăng xuất và thu hồi refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Thiếu refresh token' })
  @ApiUnauthorizedResponse({ description: 'Refresh token không hợp lệ' })
  async logout(@Body() body: RefreshTokenDto) {
    if (!body?.refreshToken) {
      throw new HttpException('Refresh token is required', 400);
    }
    const result = await this.authService.logout(body.refreshToken);
    if (!result) {
      throw new HttpException('Invalid refresh token', 401);
    }
    return { message: 'Logged out successfully' };
  }
}
