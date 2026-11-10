import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.service';
import { UsersModule } from '../users/users.module';
import { SurveyRecordsEventsInterceptor } from './survey-records-events.interceptor';
import { SurveyRecordsController } from './survey-records.controller';
import { SurveyRecordsGateway } from './survey-records.gateway';
import { SurveyRecordsService } from './survey-records.service';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [SurveyRecordsController],
  providers: [
    PrismaService,
    SurveyRecordsService,
    SurveyRecordsGateway,
    SurveyRecordsEventsInterceptor,
  ],
})
export class SurveyRecordsModule {}
