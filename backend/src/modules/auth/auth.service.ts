import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.service';

type AuthUser = { id: number; username: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(user: AuthUser) {
    const payload = { username: user.username, sub: user.id };

    const refreshToken = this.jwtService.sign(
      { ...payload, token_use: 'refresh' },
      { expiresIn: Number(process.env.JWT_REFRESH_EXPIRES_IN) || 2592000 },
    );
    await this.prisma.tokens.create({
      data: { user_id: user.id, refreshToken },
    });

    const accessToken = this.jwtService.sign({
      ...payload,
      token_use: 'access',
    });

    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string) {
    const storedToken = await this.prisma.tokens.findUnique({
      where: { refreshToken },
    });
    if (!storedToken) {
      return null;
    }

    let payload: { sub: number; username: string; token_use?: string };
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      return null;
    }
    if (payload.token_use !== 'refresh') {
      return null;
    }

    const accessToken = this.jwtService.sign({
      username: payload.username,
      sub: payload.sub,
      token_use: 'access',
    });
    return { accessToken };
  }

  async logout(refreshToken: string) {
    const result = await this.prisma.tokens.deleteMany({
      where: { refreshToken },
    });
    return result.count > 0;
  }
}
