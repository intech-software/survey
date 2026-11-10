import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import {
  mutateTemplateStructure,
  shiftTemplateOrdersForInsert,
  compactTemplateOrders,
  moveTemplateNode,
  validateMoveDirection,
} from './survey-template-order.utils';
import { CreateSurveyTemplateParameterDto } from './dto/create-survey-template-parameter.dto';
import { UpdateSurveyTemplateParameterDto } from './dto/update-survey-template-parameter.dto';

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

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
};

const surveyTemplateParameterInclude = {
  createdBy: { select: creatorSelect },
} satisfies Prisma.SurveyTemplateParametersInclude;

@Injectable()
export class SurveyTemplateParametersService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAllByStep(stepId: number) {
    const normalizedStepId = this.normalizePositiveInteger(stepId, 'stepId');
    await this.ensureStepExists(normalizedStepId);

    return this.prismaService.surveyTemplateParameters.findMany({
      where: { survey_template_step_id: normalizedStepId },
      include: surveyTemplateParameterInclude,
      orderBy: [{ parameter_order: 'asc' }, { id: 'asc' }],
    });
  }

  async findById(
    id: number,
    client: Prisma.TransactionClient = this.prismaService,
  ) {
    const parameter = await client.surveyTemplateParameters.findUnique({
      where: { id },
      include: surveyTemplateParameterInclude,
    });

    if (!parameter) {
      throw new NotFoundException('Survey template parameter not found');
    }

    return parameter;
  }

  async create(
    stepId: number,
    dto: CreateSurveyTemplateParameterDto,
    user?: AuthenticatedUser,
  ) {
    const parentId = this.normalizePositiveInteger(stepId, 'stepId');
    const order = this.normalizePositiveInteger(
      dto?.parameter_order,
      'parameter_order',
    );
    const userId = this.normalizeUserId(user);
    return mutateTemplateStructure(
      this.prismaService,
      { kind: 'step', id: parentId },
      async (tx) => {
        await this.ensureStepExists(parentId, tx);
        await this.ensureParameterOrderAvailable(
          parentId,
          order,
          undefined,
          tx,
        );
        const created = await tx.surveyTemplateParameters.create({
          data: {
            survey_template_step_id: parentId,
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
            parameter_order: order,
            created_by_id: userId,
          },
          include: surveyTemplateParameterInclude,
        });
        return { ...created, siblings: await this.findSiblings(tx, parentId) };
      },
    );
  }

  async update(id: number, dto: UpdateSurveyTemplateParameterDto) {
    const data = this.normalizeUpdateData(dto);
    return mutateTemplateStructure(
      this.prismaService,
      { kind: 'parameter', id },
      async (tx) => {
        const current = await this.findById(id, tx);
        if (typeof data.parameter_order === 'number') {
          await this.ensureParameterOrderAvailable(
            current.survey_template_step_id,
            data.parameter_order,
            id,
            tx,
          );
        }
        const updated = await tx.surveyTemplateParameters.update({
          where: { id },
          data,
          include: surveyTemplateParameterInclude,
        });
        return {
          ...updated,
          siblings: await this.findSiblings(
            tx,
            current.survey_template_step_id,
          ),
        };
      },
    );
  }

  async delete(id: number) {
    return mutateTemplateStructure(
      this.prismaService,
      { kind: 'parameter', id },
      async (tx) => {
        const current = await this.findById(id, tx);
        const deleted = await tx.surveyTemplateParameters.delete({
          where: { id },
          include: surveyTemplateParameterInclude,
        });
        const remaining = await this.findSiblings(
          tx,
          current.survey_template_step_id,
        );
        await compactTemplateOrders(
          remaining.map((node) => ({
            id: node.id,
            order: node.parameter_order,
          })),
          (nodeId, order) =>
            tx.surveyTemplateParameters.update({
              where: { id: nodeId },
              data: { parameter_order: order },
            }),
        );
        return {
          ...deleted,
          siblings: await this.findSiblings(
            tx,
            current.survey_template_step_id,
          ),
        };
      },
    );
  }

  async move(id: number, direction: unknown) {
    validateMoveDirection(direction);
    return mutateTemplateStructure(
      this.prismaService,
      { kind: 'parameter', id },
      async (tx) => {
        const current = await this.findById(id, tx);
        const siblings = await this.findSiblings(
          tx,
          current.survey_template_step_id,
        );
        await moveTemplateNode(
          siblings.map((node) => ({
            id: node.id,
            order: node.parameter_order,
          })),
          id,
          direction,
          (nodeId, order) =>
            tx.surveyTemplateParameters.update({
              where: { id: nodeId },
              data: { parameter_order: order },
            }),
        );
        return {
          ...(await this.findById(id, tx)),
          siblings: await this.findSiblings(
            tx,
            current.survey_template_step_id,
          ),
        };
      },
    );
  }

  async duplicate(id: number, user?: AuthenticatedUser) {
    const userId = this.normalizeUserId(user);
    return mutateTemplateStructure(
      this.prismaService,
      { kind: 'parameter', id },
      async (tx) => {
        const source = await tx.surveyTemplateParameters.findUnique({
          where: { id },
          include: surveyTemplateParameterInclude,
        });
        if (!source)
          throw new NotFoundException('Survey template parameter not found');
        const siblings = await this.findSiblings(
          tx,
          source.survey_template_step_id,
        );
        const order = source.parameter_order + 1;
        await shiftTemplateOrdersForInsert(
          siblings.map((node) => ({
            id: node.id,
            order: node.parameter_order,
          })),
          order,
          (nodeId, nextOrder) =>
            tx.surveyTemplateParameters.update({
              where: { id: nodeId },
              data: { parameter_order: nextOrder },
            }),
        );
        const created = await tx.surveyTemplateParameters.create({
          data: {
            survey_template_step_id: source.survey_template_step_id,
            parameter_name: source.parameter_name,
            data_type: source.data_type,
            unit: source.unit,
            requirement: source.requirement,
            parameter_order: order,
            created_by_id: userId,
          },
          include: surveyTemplateParameterInclude,
        });
        return {
          ...created,
          siblings: await this.findSiblings(tx, source.survey_template_step_id),
        };
      },
    );
  }

  private findSiblings(tx: Prisma.TransactionClient, parentId: number) {
    return tx.surveyTemplateParameters.findMany({
      where: { survey_template_step_id: parentId },
      include: surveyTemplateParameterInclude,
      orderBy: [{ parameter_order: 'asc' }, { id: 'asc' }],
    });
  }

  private normalizeUpdateData(dto: UpdateSurveyTemplateParameterDto) {
    const updateDto = dto ?? {};
    const data: Prisma.SurveyTemplateParametersUpdateInput = {};

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

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private normalizeRequiredText(
    value: unknown,
    fieldName: string,
    maxLength?: number,
  ) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue = (
      typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : ''
    ).trim();
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
    if (value === null || value === undefined) {
      return null;
    }

    const normalizedValue = (
      typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : ''
    ).trim();
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

  private async ensureStepExists(
    stepId: number,
    client: Prisma.TransactionClient = this.prismaService,
  ) {
    const step = await client.surveyTemplateSteps.findUnique({
      where: { id: stepId },
      select: { id: true },
    });

    if (!step) {
      throw new NotFoundException('Survey template step not found');
    }
  }

  private async ensureParameterOrderAvailable(
    stepId: number,
    parameterOrder: number,
    excludedParameterId?: number,
    client: Prisma.TransactionClient = this.prismaService,
  ) {
    const existing = await client.surveyTemplateParameters.findUnique({
      where: {
        survey_template_step_id_parameter_order: {
          survey_template_step_id: stepId,
          parameter_order: parameterOrder,
        },
      },
      select: { id: true },
    });

    if (existing && existing.id !== excludedParameterId) {
      throw new ConflictException(
        'Parameter order already exists for this survey template step',
      );
    }
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
