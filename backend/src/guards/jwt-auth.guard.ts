import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | false,
    info: unknown,
  ): TUser {
    if (err || info || !user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }
}
