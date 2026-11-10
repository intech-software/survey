import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../modules/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: { sub?: unknown; token_use?: string }) {
    // Only access tokens may call protected APIs; refresh tokens are rejected.
    if (payload?.token_use !== 'access') {
      throw new UnauthorizedException('Invalid token');
    }

    const userId = Number(payload?.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
