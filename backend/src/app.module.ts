import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SurveyRecordsModule } from './modules/survey-records/survey-records.module';
import { SurveyTemplatesModule } from './modules/survey-templates/survey-templates.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UsersModule,
    AuthModule,
    SurveyTemplatesModule,
    SurveyRecordsModule,
  ],
})
export class AppModule {}
