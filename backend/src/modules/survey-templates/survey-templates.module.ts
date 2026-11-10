import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UsersModule } from '../users/users.module';
import { SurveyTemplateParametersService } from './survey-template-parameters.service';
import { SurveyTemplateStagesService } from './survey-template-stages.service';
import { SurveyTemplateStepsService } from './survey-template-steps.service';
import { SurveyTemplatesController } from './survey-templates.controller';
import { SurveyTemplatesService } from './survey-templates.service';

@Module({
  imports: [UsersModule],
  controllers: [SurveyTemplatesController],
  providers: [
    PrismaService,
    SurveyTemplatesService,
    SurveyTemplateStagesService,
    SurveyTemplateStepsService,
    SurveyTemplateParametersService,
  ],
})
export class SurveyTemplatesModule {}
