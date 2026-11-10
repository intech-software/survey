import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { JwtStrategy } from '../../passports/jwt.strategy';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, JwtStrategy],
  exports: [UsersService],
})
export class UsersModule {}
