import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CreateSurveyTemplateParameterDto } from './dto/create-survey-template-parameter.dto';
import { CreateSurveyTemplateStageDto } from './dto/create-survey-template-stage.dto';
import { CreateSurveyTemplateStepDto } from './dto/create-survey-template-step.dto';
import { MoveSurveyTemplateNodeDto } from './dto/move-survey-template-node.dto';
import {
  CopySurveyTemplateDto,
  CreateSurveyTemplateDto,
  UpdateSurveyTemplateDto,
} from './dto/survey-template.dto';
import { UpdateSurveyTemplateParameterDto } from './dto/update-survey-template-parameter.dto';
import { UpdateSurveyTemplateStageDto } from './dto/update-survey-template-stage.dto';
import { UpdateSurveyTemplateStepDto } from './dto/update-survey-template-step.dto';
import { SurveyTemplateParametersService } from './survey-template-parameters.service';
import { SurveyTemplateStagesService } from './survey-template-stages.service';
import { SurveyTemplateStepsService } from './survey-template-steps.service';
import { SurveyTemplatesService } from './survey-templates.service';

type AuthRequest = { user: { id: number } };

@Controller()
@ApiTags('Survey templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class SurveyTemplatesController {
  constructor(
    private readonly templatesService: SurveyTemplatesService,
    private readonly stagesService: SurveyTemplateStagesService,
    private readonly stepsService: SurveyTemplateStepsService,
    private readonly parametersService: SurveyTemplateParametersService,
  ) {}

  // ---- Templates -------------------------------------------------------

  @Get('survey-templates')
  @ApiOperation({ summary: 'Danh sách template phiếu khảo sát' })
  findAll() {
    return this.templatesService.findAll();
  }

  @Post('survey-templates')
  @ApiOperation({ summary: 'Tạo template phiếu khảo sát' })
  create(@Body() dto: CreateSurveyTemplateDto, @Request() req: AuthRequest) {
    return this.templatesService.create(dto, req.user);
  }

  @Post('survey-templates/copy')
  @ApiOperation({
    summary: 'Nhân bản template (gồm toàn bộ giai đoạn, bước, thông số)',
  })
  copy(@Body() dto: CopySurveyTemplateDto, @Request() req: AuthRequest) {
    return this.templatesService.copyFromTemplate(dto, req.user);
  }

  @Get('survey-templates/:templateId')
  @ApiOperation({ summary: 'Chi tiết template kèm giai đoạn, bước, thông số' })
  findById(@Param('templateId', ParseIntPipe) templateId: number) {
    return this.templatesService.findById(templateId);
  }

  @Patch('survey-templates/:templateId')
  @ApiOperation({ summary: 'Cập nhật thông tin template / trạng thái' })
  update(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() dto: UpdateSurveyTemplateDto,
  ) {
    return this.templatesService.update(templateId, dto);
  }

  @Delete('survey-templates/:templateId')
  @ApiOperation({ summary: 'Xóa template' })
  delete(@Param('templateId', ParseIntPipe) templateId: number) {
    return this.templatesService.delete(templateId);
  }

  // ---- Stages ----------------------------------------------------------

  @Get('survey-templates/:templateId/stages')
  @ApiOperation({ summary: 'Danh sách giai đoạn của template' })
  findStages(@Param('templateId', ParseIntPipe) templateId: number) {
    return this.stagesService.findAllByTemplate(templateId);
  }

  @Post('survey-templates/:templateId/stages')
  @ApiOperation({ summary: 'Thêm giai đoạn (insert=true để chèn vào vị trí)' })
  createStage(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() dto: CreateSurveyTemplateStageDto,
    @Request() req: AuthRequest,
  ) {
    return this.stagesService.create(templateId, dto, req.user);
  }

  @Get('survey-template-stages/:stageId')
  findStage(@Param('stageId', ParseIntPipe) stageId: number) {
    return this.stagesService.findById(stageId);
  }

  @Patch('survey-template-stages/:stageId')
  updateStage(
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() dto: UpdateSurveyTemplateStageDto,
  ) {
    return this.stagesService.update(stageId, dto);
  }

  @Delete('survey-template-stages/:stageId')
  deleteStage(@Param('stageId', ParseIntPipe) stageId: number) {
    return this.stagesService.delete(stageId);
  }

  @Post('survey-template-stages/:stageId/duplicate')
  @ApiOperation({ summary: 'Nhân bản giai đoạn xuống ngay phía dưới' })
  duplicateStage(
    @Param('stageId', ParseIntPipe) stageId: number,
    @Request() req: AuthRequest,
  ) {
    return this.stagesService.duplicate(stageId, req.user);
  }

  @Patch('survey-template-stages/:stageId/move')
  @ApiOperation({ summary: 'Di chuyển giai đoạn lên/xuống' })
  moveStage(
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() dto: MoveSurveyTemplateNodeDto,
  ) {
    return this.stagesService.move(stageId, dto?.direction);
  }

  // ---- Steps -----------------------------------------------------------

  @Get('survey-template-stages/:stageId/steps')
  findSteps(@Param('stageId', ParseIntPipe) stageId: number) {
    return this.stepsService.findAllByStage(stageId);
  }

  @Post('survey-template-stages/:stageId/steps')
  @ApiOperation({ summary: 'Thêm bước vào giai đoạn' })
  createStep(
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() dto: CreateSurveyTemplateStepDto,
    @Request() req: AuthRequest,
  ) {
    return this.stepsService.create(stageId, dto, req.user);
  }

  @Get('survey-template-steps/:stepId')
  findStep(@Param('stepId', ParseIntPipe) stepId: number) {
    return this.stepsService.findById(stepId);
  }

  @Patch('survey-template-steps/:stepId')
  updateStep(
    @Param('stepId', ParseIntPipe) stepId: number,
    @Body() dto: UpdateSurveyTemplateStepDto,
  ) {
    return this.stepsService.update(stepId, dto);
  }

  @Delete('survey-template-steps/:stepId')
  deleteStep(@Param('stepId', ParseIntPipe) stepId: number) {
    return this.stepsService.delete(stepId);
  }

  @Post('survey-template-steps/:stepId/duplicate')
  duplicateStep(
    @Param('stepId', ParseIntPipe) stepId: number,
    @Request() req: AuthRequest,
  ) {
    return this.stepsService.duplicate(stepId, req.user);
  }

  @Patch('survey-template-steps/:stepId/move')
  moveStep(
    @Param('stepId', ParseIntPipe) stepId: number,
    @Body() dto: MoveSurveyTemplateNodeDto,
  ) {
    return this.stepsService.move(stepId, dto?.direction);
  }

  // ---- Parameters ------------------------------------------------------

  @Get('survey-template-steps/:stepId/parameters')
  findParameters(@Param('stepId', ParseIntPipe) stepId: number) {
    return this.parametersService.findAllByStep(stepId);
  }

  @Post('survey-template-steps/:stepId/parameters')
  @ApiOperation({ summary: 'Thêm thông số vào bước' })
  createParameter(
    @Param('stepId', ParseIntPipe) stepId: number,
    @Body() dto: CreateSurveyTemplateParameterDto,
    @Request() req: AuthRequest,
  ) {
    return this.parametersService.create(stepId, dto, req.user);
  }

  @Get('survey-template-parameters/:parameterId')
  findParameter(@Param('parameterId', ParseIntPipe) parameterId: number) {
    return this.parametersService.findById(parameterId);
  }

  @Patch('survey-template-parameters/:parameterId')
  updateParameter(
    @Param('parameterId', ParseIntPipe) parameterId: number,
    @Body() dto: UpdateSurveyTemplateParameterDto,
  ) {
    return this.parametersService.update(parameterId, dto);
  }

  @Delete('survey-template-parameters/:parameterId')
  deleteParameter(@Param('parameterId', ParseIntPipe) parameterId: number) {
    return this.parametersService.delete(parameterId);
  }

  @Post('survey-template-parameters/:parameterId/duplicate')
  duplicateParameter(
    @Param('parameterId', ParseIntPipe) parameterId: number,
    @Request() req: AuthRequest,
  ) {
    return this.parametersService.duplicate(parameterId, req.user);
  }

  @Patch('survey-template-parameters/:parameterId/move')
  moveParameter(
    @Param('parameterId', ParseIntPipe) parameterId: number,
    @Body() dto: MoveSurveyTemplateNodeDto,
  ) {
    return this.parametersService.move(parameterId, dto?.direction);
  }
}
