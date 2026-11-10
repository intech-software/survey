import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import {
  CreateSurveyRecordDto,
  CreateSurveyRecordParameterDto,
  CreateSurveyRecordStageDto,
  CreateSurveyRecordStepDto,
  UpdateSurveyRecordDto,
  UpdateSurveyRecordParameterDto,
  UpdateSurveyRecordParameterResultDto,
  UpdateSurveyRecordStageDto,
  UpdateSurveyRecordStepDto,
} from './dto/survey-record.dto';
import {
  removeSurveyRecordImageByPath,
  resolveSurveyRecordImage,
  storeSurveyRecordImage,
} from './survey-record-image.storage';

type AuthenticatedUser = { id?: number | string | null };

const DATA_TYPES = [
  'text',
  'number',
  'decimal',
  'boolean',
  'date',
  'datetime',
  'select',
] as const;

const userSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  avatar: true,
};

const recordHeaderInclude = {
  createdBy: { select: userSelect },
  checkedBy: { select: userSelect },
  approvedBy: { select: userSelect },
} satisfies Prisma.SurveyRecordsInclude;

const recordInclude = {
  ...recordHeaderInclude,
  stages: {
    orderBy: [{ stage_order: 'asc' }, { id: 'asc' }],
    include: {
      steps: {
        orderBy: [{ step_order: 'asc' }, { id: 'asc' }],
        include: {
          parameters: {
            orderBy: [{ parameter_order: 'asc' }, { id: 'asc' }],
            include: { recordedBy: { select: userSelect } },
          },
        },
      },
    },
  },
} satisfies Prisma.SurveyRecordsInclude;

const templateTreeInclude = {
  stages: {
    orderBy: [{ stage_order: 'asc' }, { id: 'asc' }],
    include: {
      steps: {
        orderBy: [{ step_order: 'asc' }, { id: 'asc' }],
        include: {
          parameters: { orderBy: [{ parameter_order: 'asc' }, { id: 'asc' }] },
        },
      },
    },
  },
} satisfies Prisma.SurveyTemplatesInclude;

const parameterInclude = { recordedBy: { select: userSelect } };

const toText = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

@Injectable()
export class SurveyRecordsService {
  constructor(private readonly prismaService: PrismaService) {}

  // ---- Records -----------------------------------------------------------

  findAll() {
    return this.prismaService.surveyRecords.findMany({
      include: recordHeaderInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async findById(id: number) {
    const record = await this.prismaService.surveyRecords.findUnique({
      where: { id },
      include: recordInclude,
    });
    if (!record) {
      throw new NotFoundException('Survey record not found');
    }
    return record;
  }

  /** Creates a record by copying the whole stage/step/parameter tree. */
  async create(dto: CreateSurveyRecordDto, user?: AuthenticatedUser) {
    const templateId = this.normalizePositiveInteger(
      dto?.survey_template_id,
      'survey_template_id',
    );
    const template = await this.prismaService.surveyTemplates.findUnique({
      where: { id: templateId },
      include: templateTreeInclude,
    });
    if (!template) {
      throw new NotFoundException('Survey template not found');
    }
    if (template.status !== 'active') {
      throw new BadRequestException('Survey template is inactive');
    }

    return this.prismaService.surveyRecords.create({
      data: {
        survey_template_id: template.id,
        template_code: template.code,
        template_name: template.name,
        template_version: template.version,
        title: this.normalizeRequiredText(dto?.title, 'title', 255),
        project: this.normalizeOptionalText(dto?.project, 'project', 255),
        location: this.normalizeOptionalText(dto?.location, 'location', 255),
        survey_date: this.normalizeOptionalDate(
          dto?.survey_date,
          'survey_date',
        ),
        description: this.normalizeOptionalText(
          dto?.description,
          'description',
        ),
        created_by_id: this.normalizeUserId(user),
        stages: {
          create: template.stages.map((stage) => ({
            source_template_stage_id: stage.id,
            stage_name: stage.stage_name,
            stage_order: stage.stage_order,
            steps: {
              create: stage.steps.map((step) => ({
                source_template_step_id: step.id,
                step_name: step.step_name,
                step_order: step.step_order,
                parameters: {
                  create: step.parameters.map((parameter) => ({
                    source_template_parameter_id: parameter.id,
                    parameter_name: parameter.parameter_name,
                    data_type: parameter.data_type,
                    unit: parameter.unit,
                    requirement: parameter.requirement,
                    parameter_order: parameter.parameter_order,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: recordInclude,
    });
  }

  async update(id: number, dto: UpdateSurveyRecordDto) {
    const record = await this.findRecordStateOrThrow(id);
    this.ensureNotChecked(record, 'Survey record information');

    const updateDto = dto ?? {};
    const data: Prisma.SurveyRecordsUpdateInput = {};
    if ('title' in updateDto) {
      data.title = this.normalizeRequiredText(updateDto.title, 'title', 255);
    }
    if ('project' in updateDto) {
      data.project = this.normalizeOptionalText(
        updateDto.project,
        'project',
        255,
      );
    }
    if ('location' in updateDto) {
      data.location = this.normalizeOptionalText(
        updateDto.location,
        'location',
        255,
      );
    }
    if ('survey_date' in updateDto) {
      data.survey_date = this.normalizeOptionalDate(
        updateDto.survey_date,
        'survey_date',
      );
    }
    if ('description' in updateDto) {
      data.description = this.normalizeOptionalText(
        updateDto.description,
        'description',
      );
    }
    this.ensureUpdateData(data);

    return this.prismaService.surveyRecords.update({
      where: { id },
      data,
      include: recordInclude,
    });
  }

  async delete(id: number) {
    const record = await this.findRecordStateOrThrow(id);
    if (record.approved_at) {
      throw new ForbiddenException(
        'An approved survey record cannot be deleted',
      );
    }

    const imagePaths = await this.prismaService.surveyRecordParameters.findMany(
      {
        where: {
          surveyRecordStep: { surveyRecordStage: { survey_record_id: id } },
          result_image_path: { not: null },
        },
        select: { result_image_path: true },
      },
    );
    const deleted = await this.prismaService.surveyRecords.delete({
      where: { id },
      include: recordHeaderInclude,
    });
    for (const { result_image_path } of imagePaths) {
      await removeSurveyRecordImageByPath(result_image_path);
    }
    return deleted;
  }

  /** First signature: the record content is confirmed before entry starts. */
  async check(id: number, user?: AuthenticatedUser) {
    const record = await this.findRecordStateOrThrow(id);
    if (record.checked_at) {
      throw new ConflictException('Survey record has already been checked');
    }

    return this.prismaService.surveyRecords.update({
      where: { id },
      data: {
        checked_by_id: this.normalizeUserId(user),
        checked_at: new Date(),
      },
      include: recordInclude,
    });
  }

  /** Final signature: results become read-only. */
  async approve(id: number, user?: AuthenticatedUser) {
    const record = await this.findRecordStateOrThrow(id);
    if (!record.checked_at) {
      throw new BadRequestException(
        'Survey record must be checked before approval',
      );
    }
    if (record.approved_at) {
      throw new ConflictException('Survey record has already been approved');
    }

    return this.prismaService.surveyRecords.update({
      where: { id },
      data: {
        approved_by_id: this.normalizeUserId(user),
        approved_at: new Date(),
      },
      include: recordInclude,
    });
  }

  // ---- Structure (editable until the record is checked) ------------------

  async createStage(recordId: number, dto: CreateSurveyRecordStageDto) {
    await this.ensureStructureEditable(recordId);
    const stageOrder = this.normalizePositiveInteger(
      dto?.stage_order,
      'stage_order',
    );
    await this.ensureStageOrderAvailable(recordId, stageOrder);

    return this.prismaService.surveyRecordStages.create({
      data: {
        survey_record_id: recordId,
        stage_name: this.normalizeRequiredText(
          dto?.stage_name,
          'stage_name',
          255,
        ),
        stage_order: stageOrder,
      },
    });
  }

  async updateStage(stageId: number, dto: UpdateSurveyRecordStageDto) {
    const stage = await this.findStageOrThrow(stageId);
    await this.ensureStructureEditable(stage.survey_record_id);
    const data: Prisma.SurveyRecordStagesUncheckedUpdateInput = {};

    if ('stage_name' in (dto ?? {})) {
      data.stage_name = this.normalizeRequiredText(
        dto.stage_name,
        'stage_name',
        255,
      );
    }
    if ('stage_order' in (dto ?? {})) {
      data.stage_order = this.normalizePositiveInteger(
        dto.stage_order,
        'stage_order',
      );
    }
    this.ensureUpdateData(data);

    if (typeof data.stage_order === 'number') {
      await this.ensureStageOrderAvailable(
        stage.survey_record_id,
        data.stage_order,
        stageId,
      );
    }

    return this.prismaService.surveyRecordStages.update({
      where: { id: stageId },
      data,
    });
  }

  async deleteStage(stageId: number) {
    const stage = await this.findStageOrThrow(stageId);
    await this.ensureStructureEditable(stage.survey_record_id);
    const imagePaths = await this.prismaService.surveyRecordParameters.findMany(
      {
        where: {
          surveyRecordStep: { survey_record_stage_id: stageId },
          result_image_path: { not: null },
        },
        select: { result_image_path: true },
      },
    );
    const deleted = await this.prismaService.surveyRecordStages.delete({
      where: { id: stageId },
    });
    for (const { result_image_path } of imagePaths) {
      await removeSurveyRecordImageByPath(result_image_path);
    }
    return deleted;
  }

  async createStep(stageId: number, dto: CreateSurveyRecordStepDto) {
    const stage = await this.findStageOrThrow(stageId);
    await this.ensureStructureEditable(stage.survey_record_id);
    const stepOrder = this.normalizePositiveInteger(
      dto?.step_order,
      'step_order',
    );
    await this.ensureStepOrderAvailable(stageId, stepOrder);

    return this.prismaService.surveyRecordSteps.create({
      data: {
        survey_record_stage_id: stageId,
        step_name: this.normalizeRequiredText(dto?.step_name, 'step_name', 255),
        step_order: stepOrder,
      },
    });
  }

  async updateStep(stepId: number, dto: UpdateSurveyRecordStepDto) {
    const step = await this.findStepOrThrow(stepId);
    await this.ensureStructureEditable(step.surveyRecordStage.survey_record_id);
    const data: Prisma.SurveyRecordStepsUncheckedUpdateInput = {};

    if ('step_name' in (dto ?? {})) {
      data.step_name = this.normalizeRequiredText(
        dto.step_name,
        'step_name',
        255,
      );
    }
    if ('step_order' in (dto ?? {})) {
      data.step_order = this.normalizePositiveInteger(
        dto.step_order,
        'step_order',
      );
    }
    this.ensureUpdateData(data);

    if (typeof data.step_order === 'number') {
      await this.ensureStepOrderAvailable(
        step.survey_record_stage_id,
        data.step_order,
        stepId,
      );
    }

    return this.prismaService.surveyRecordSteps.update({
      where: { id: stepId },
      data,
    });
  }

  async deleteStep(stepId: number) {
    const step = await this.findStepOrThrow(stepId);
    await this.ensureStructureEditable(step.surveyRecordStage.survey_record_id);
    const imagePaths = await this.prismaService.surveyRecordParameters.findMany(
      {
        where: {
          survey_record_step_id: stepId,
          result_image_path: { not: null },
        },
        select: { result_image_path: true },
      },
    );
    const deleted = await this.prismaService.surveyRecordSteps.delete({
      where: { id: stepId },
    });
    for (const { result_image_path } of imagePaths) {
      await removeSurveyRecordImageByPath(result_image_path);
    }
    return deleted;
  }

  async createParameter(stepId: number, dto: CreateSurveyRecordParameterDto) {
    const step = await this.findStepOrThrow(stepId);
    await this.ensureStructureEditable(step.surveyRecordStage.survey_record_id);
    const parameterOrder = this.normalizePositiveInteger(
      dto?.parameter_order,
      'parameter_order',
    );
    await this.ensureParameterOrderAvailable(stepId, parameterOrder);

    return this.prismaService.surveyRecordParameters.create({
      data: {
        survey_record_step_id: stepId,
        parameter_name: this.normalizeRequiredText(
          dto?.parameter_name,
          'parameter_name',
          255,
        ),
        data_type: this.normalizeDataType(dto?.data_type),
        unit: this.normalizeOptionalText(dto?.unit, 'unit', 50),
        requirement: this.normalizeRequiredText(
          dto?.requirement,
          'requirement',
        ),
        parameter_order: parameterOrder,
      },
      include: parameterInclude,
    });
  }

  async updateParameter(
    parameterId: number,
    dto: UpdateSurveyRecordParameterDto,
  ) {
    const parameter = await this.findParameterOrThrow(parameterId);
    await this.ensureStructureEditable(parameter.recordId);
    const data: Prisma.SurveyRecordParametersUncheckedUpdateInput = {};
    const updateDto = dto ?? {};

    if ('parameter_name' in updateDto) {
      data.parameter_name = this.normalizeRequiredText(
        updateDto.parameter_name,
        'parameter_name',
        255,
      );
    }
    if ('data_type' in updateDto) {
      data.data_type = this.normalizeDataType(updateDto.data_type);
    }
    if ('unit' in updateDto) {
      data.unit = this.normalizeOptionalText(updateDto.unit, 'unit', 50);
    }
    if ('requirement' in updateDto) {
      data.requirement = this.normalizeRequiredText(
        updateDto.requirement,
        'requirement',
      );
    }
    if ('parameter_order' in updateDto) {
      data.parameter_order = this.normalizePositiveInteger(
        updateDto.parameter_order,
        'parameter_order',
      );
    }
    this.ensureUpdateData(data);

    if (typeof data.parameter_order === 'number') {
      await this.ensureParameterOrderAvailable(
        parameter.survey_record_step_id,
        data.parameter_order,
        parameterId,
      );
    }

    return this.prismaService.surveyRecordParameters.update({
      where: { id: parameterId },
      data,
      include: parameterInclude,
    });
  }

  async deleteParameter(parameterId: number) {
    const parameter = await this.findParameterOrThrow(parameterId);
    await this.ensureStructureEditable(parameter.recordId);

    const deleted = await this.prismaService.surveyRecordParameters.delete({
      where: { id: parameterId },
      include: parameterInclude,
    });
    await removeSurveyRecordImageByPath(parameter.result_image_path);
    return deleted;
  }

  // ---- Entries (allowed after checking, until approval) ------------------

  async updateParameterResult(
    parameterId: number,
    dto: UpdateSurveyRecordParameterResultDto,
    user?: AuthenticatedUser,
  ) {
    if (
      !dto ||
      (!('result_value' in dto) &&
        !('note' in dto) &&
        !('result_image_path' in dto))
    ) {
      throw new BadRequestException(
        'result_value, note or result_image_path is required',
      );
    }

    const parameter = await this.findParameterForEntryOrThrow(parameterId);
    const data: Prisma.SurveyRecordParametersUncheckedUpdateInput = {};

    if ('result_value' in dto) {
      const resultValue = this.normalizeResultValue(
        dto.result_value,
        parameter.data_type,
      );
      if (resultValue === null) {
        data.result_value = null;
        data.recorded_by_id = null;
        data.recorded_at = null;
      } else {
        data.result_value = resultValue;
        data.recorded_by_id = this.normalizeUserId(user);
        data.recorded_at = new Date();
      }
    }

    if ('result_image_path' in dto) {
      // Only clearing is allowed here; new images go through the upload route.
      if (dto.result_image_path !== null && dto.result_image_path !== '') {
        throw new BadRequestException(
          'result_image_path can only be cleared; upload a new image instead',
        );
      }
      data.result_image_path = null;
    }

    if ('note' in dto) {
      data.note = this.normalizeOptionalText(dto.note, 'note');
    }

    const updated = await this.prismaService.surveyRecordParameters.update({
      where: { id: parameterId },
      data,
      include: parameterInclude,
    });

    if (
      'result_image_path' in dto &&
      parameter.result_image_path !== updated.result_image_path
    ) {
      await removeSurveyRecordImageByPath(parameter.result_image_path);
    }

    return updated;
  }

  async uploadParameterImage(parameterId: number, file: Express.Multer.File) {
    const parameter = await this.findParameterForEntryOrThrow(parameterId);
    const imagePath = await storeSurveyRecordImage(file);

    try {
      const updated = await this.prismaService.surveyRecordParameters.update({
        where: { id: parameterId },
        data: { result_image_path: imagePath },
        include: parameterInclude,
      });
      await removeSurveyRecordImageByPath(parameter.result_image_path);
      return updated;
    } catch (error) {
      await removeSurveyRecordImageByPath(imagePath);
      throw error;
    }
  }

  findParameterImageFile(filename: string, original = false) {
    return resolveSurveyRecordImage(filename, original);
  }

  /** Resolves the record that a mutation result belongs to (for realtime). */
  async resolveRecordId(result: Record<string, unknown>) {
    if ('template_code' in result) return Number(result.id);
    if ('survey_record_id' in result) return Number(result.survey_record_id);
    if ('survey_record_stage_id' in result) {
      const stage = await this.prismaService.surveyRecordStages.findUnique({
        where: { id: Number(result.survey_record_stage_id) },
        select: { survey_record_id: true },
      });
      return stage?.survey_record_id;
    }
    if ('survey_record_step_id' in result) {
      const step = await this.prismaService.surveyRecordSteps.findUnique({
        where: { id: Number(result.survey_record_step_id) },
        select: { surveyRecordStage: { select: { survey_record_id: true } } },
      });
      return step?.surveyRecordStage.survey_record_id;
    }
    return undefined;
  }

  // ---- Guards --------------------------------------------------------------

  private async findRecordStateOrThrow(recordId: number) {
    const record = await this.prismaService.surveyRecords.findUnique({
      where: { id: recordId },
      select: { id: true, checked_at: true, approved_at: true },
    });
    if (!record) {
      throw new NotFoundException('Survey record not found');
    }
    return record;
  }

  private ensureNotChecked(
    record: { checked_at: Date | null },
    subject = 'Survey record structure',
  ) {
    if (record.checked_at) {
      throw new ForbiddenException(
        `${subject} cannot be changed after the record has been checked`,
      );
    }
  }

  private async ensureStructureEditable(recordId: number) {
    this.ensureNotChecked(await this.findRecordStateOrThrow(recordId));
  }

  private async findStageOrThrow(stageId: number) {
    const stage = await this.prismaService.surveyRecordStages.findUnique({
      where: { id: stageId },
      select: { id: true, survey_record_id: true },
    });
    if (!stage) {
      throw new NotFoundException('Survey record stage not found');
    }
    return stage;
  }

  private async findStepOrThrow(stepId: number) {
    const step = await this.prismaService.surveyRecordSteps.findUnique({
      where: { id: stepId },
      select: {
        id: true,
        survey_record_stage_id: true,
        surveyRecordStage: { select: { survey_record_id: true } },
      },
    });
    if (!step) {
      throw new NotFoundException('Survey record step not found');
    }
    return step;
  }

  private async findParameterOrThrow(parameterId: number) {
    const parameter =
      await this.prismaService.surveyRecordParameters.findUnique({
        where: { id: parameterId },
        select: {
          id: true,
          survey_record_step_id: true,
          result_image_path: true,
          surveyRecordStep: {
            select: {
              surveyRecordStage: { select: { survey_record_id: true } },
            },
          },
        },
      });
    if (!parameter) {
      throw new NotFoundException('Survey record parameter not found');
    }
    return {
      ...parameter,
      recordId: parameter.surveyRecordStep.surveyRecordStage.survey_record_id,
    };
  }

  /** Entries are allowed only between the check and the final approval. */
  private async findParameterForEntryOrThrow(parameterId: number) {
    const parameter =
      await this.prismaService.surveyRecordParameters.findUnique({
        where: { id: parameterId },
        select: {
          id: true,
          data_type: true,
          result_image_path: true,
          surveyRecordStep: {
            select: {
              surveyRecordStage: {
                select: {
                  surveyRecord: {
                    select: { checked_at: true, approved_at: true },
                  },
                },
              },
            },
          },
        },
      });
    if (!parameter) {
      throw new NotFoundException('Survey record parameter not found');
    }

    const record = parameter.surveyRecordStep.surveyRecordStage.surveyRecord;
    if (!record.checked_at) {
      throw new ForbiddenException(
        'Results can only be entered after the record has been checked',
      );
    }
    if (record.approved_at) {
      throw new ForbiddenException(
        'Results cannot be changed after the record has been approved',
      );
    }
    return parameter;
  }

  private async ensureStageOrderAvailable(
    recordId: number,
    stageOrder: number,
    excludedStageId?: number,
  ) {
    const existing = await this.prismaService.surveyRecordStages.findUnique({
      where: {
        survey_record_id_stage_order: {
          survey_record_id: recordId,
          stage_order: stageOrder,
        },
      },
      select: { id: true },
    });
    if (existing && existing.id !== excludedStageId) {
      throw new ConflictException(
        'Stage order already exists for this survey record',
      );
    }
  }

  private async ensureStepOrderAvailable(
    stageId: number,
    stepOrder: number,
    excludedStepId?: number,
  ) {
    const existing = await this.prismaService.surveyRecordSteps.findUnique({
      where: {
        survey_record_stage_id_step_order: {
          survey_record_stage_id: stageId,
          step_order: stepOrder,
        },
      },
      select: { id: true },
    });
    if (existing && existing.id !== excludedStepId) {
      throw new ConflictException(
        'Step order already exists for this survey record stage',
      );
    }
  }

  private async ensureParameterOrderAvailable(
    stepId: number,
    parameterOrder: number,
    excludedParameterId?: number,
  ) {
    const existing = await this.prismaService.surveyRecordParameters.findUnique(
      {
        where: {
          survey_record_step_id_parameter_order: {
            survey_record_step_id: stepId,
            parameter_order: parameterOrder,
          },
        },
        select: { id: true },
      },
    );
    if (existing && existing.id !== excludedParameterId) {
      throw new ConflictException(
        'Parameter order already exists for this survey record step',
      );
    }
  }

  // ---- Normalizers ---------------------------------------------------------

  private ensureUpdateData(data: object) {
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }
  }

  private normalizeRequiredText(
    value: unknown,
    fieldName: string,
    maxLength?: number,
  ) {
    const normalizedValue = toText(value).trim();
    if (!normalizedValue) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    if (maxLength && normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${maxLength} characters`,
      );
    }
    return normalizedValue;
  }

  private normalizeOptionalText(
    value: unknown,
    fieldName: string,
    maxLength?: number,
  ) {
    const normalizedValue = toText(value).trim();
    if (!normalizedValue) {
      return null;
    }
    if (maxLength && normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${maxLength} characters`,
      );
    }
    return normalizedValue;
  }

  /** Accepts YYYY-MM-DD (or an ISO string) and stores the calendar date. */
  private normalizeOptionalDate(value: unknown, fieldName: string) {
    const text = toText(value).trim();
    if (!text) return null;
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const date = match
      ? new Date(
          Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
        )
      : null;
    if (
      !date ||
      Number.isNaN(date.getTime()) ||
      date.getUTCDate() !== Number(match![3])
    ) {
      throw new BadRequestException(`${fieldName} must be a date (YYYY-MM-DD)`);
    }
    return date;
  }

  private normalizeDataType(value: unknown) {
    const normalizedValue = this.normalizeRequiredText(value, 'data_type', 30);
    if (!DATA_TYPES.includes(normalizedValue as (typeof DATA_TYPES)[number])) {
      throw new BadRequestException(
        `data_type must be one of: ${DATA_TYPES.join(', ')}`,
      );
    }
    return normalizedValue;
  }

  private normalizePositiveInteger(value: unknown, fieldName: string) {
    const normalizedValue = Number(value);
    if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }
    return normalizedValue;
  }

  private normalizeResultValue(value: unknown, dataType: string) {
    if (value === null || value === '') {
      return null;
    }
    if (!DATA_TYPES.includes(dataType as (typeof DATA_TYPES)[number])) {
      throw new BadRequestException('Unsupported parameter data_type');
    }

    if (dataType === 'text' || dataType === 'select') {
      const normalizedValue = toText(value).trim();
      if (!normalizedValue) {
        throw new BadRequestException('result_value must not be empty');
      }
      return normalizedValue;
    }

    if (dataType === 'number' || dataType === 'decimal') {
      const normalizedValue = Number(value);
      if (!Number.isFinite(normalizedValue)) {
        throw new BadRequestException('result_value must be a number');
      }
      if (dataType === 'number' && !Number.isInteger(normalizedValue)) {
        throw new BadRequestException('result_value must be an integer');
      }
      return String(normalizedValue);
    }

    if (dataType === 'boolean') {
      if (value === true || value === 'true') return 'true';
      if (value === false || value === 'false') return 'false';
      throw new BadRequestException('result_value must be a boolean');
    }

    const normalizedDate = new Date(toText(value));
    if (Number.isNaN(normalizedDate.getTime())) {
      throw new BadRequestException('result_value must be a valid date');
    }
    return dataType === 'date'
      ? normalizedDate.toISOString().slice(0, 10)
      : normalizedDate.toISOString();
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return userId;
  }
}
