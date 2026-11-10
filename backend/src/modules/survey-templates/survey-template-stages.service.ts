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
import { CreateSurveyTemplateStageDto } from './dto/create-survey-template-stage.dto';
import { UpdateSurveyTemplateStageDto } from './dto/update-survey-template-stage.dto';

type AuthenticatedUser = { id?: number | string | null };

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
};

const surveyTemplateStageInclude = {
  createdBy: { select: creatorSelect },
} satisfies Prisma.SurveyTemplateStagesInclude;

@Injectable()
export class SurveyTemplateStagesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAllByTemplate(templateId: number) {
    const normalizedTemplateId = this.normalizePositiveInteger(
      templateId,
      'templateId',
    );
    await this.ensureTemplateExists(normalizedTemplateId);

    return this.prismaService.surveyTemplateStages.findMany({
      where: { survey_template_id: normalizedTemplateId },
      include: surveyTemplateStageInclude,
      orderBy: [{ stage_order: 'asc' }, { id: 'asc' }],
    });
  }

  async findById(
    id: number,
    client: Prisma.TransactionClient = this.prismaService,
  ) {
    const stage = await client.surveyTemplateStages.findUnique({
      where: { id },
      include: surveyTemplateStageInclude,
    });

    if (!stage) {
      throw new NotFoundException('Survey template stage not found');
    }

    return stage;
  }

  async create(
    templateId: number,
    dto: CreateSurveyTemplateStageDto,
    user?: AuthenticatedUser,
  ) {
    const parentId = this.normalizePositiveInteger(templateId, 'templateId');
    const order = this.normalizePositiveInteger(
      dto?.stage_order,
      'stage_order',
    );
    const userId = this.normalizeUserId(user);
    return mutateTemplateStructure(
      this.prismaService,
      { kind: 'template', id: parentId },
      async (tx) => {
        await this.ensureTemplateExists(parentId, tx);
        if (dto.insert !== undefined && typeof dto.insert !== 'boolean') {
          throw new BadRequestException('insert must be a boolean');
        }
        if (dto.insert) {
          const siblings = await this.findSiblings(tx, parentId);
          await shiftTemplateOrdersForInsert(
            siblings.map((node) => ({ id: node.id, order: node.stage_order })),
            order,
            (nodeId, nextOrder) =>
              tx.surveyTemplateStages.update({
                where: { id: nodeId },
                data: { stage_order: nextOrder },
              }),
          );
        } else {
          await this.ensureStageOrderAvailable(parentId, order, undefined, tx);
        }
        const created = await tx.surveyTemplateStages.create({
          data: {
            survey_template_id: parentId,
            stage_name: this.normalizeStageName(dto?.stage_name),
            stage_order: order,
            created_by_id: userId,
          },
          include: surveyTemplateStageInclude,
        });
        return {
          ...created,
          steps: [],
          siblings: await this.findSiblings(tx, parentId),
        };
      },
    );
  }

  async update(id: number, dto: UpdateSurveyTemplateStageDto) {
    const data = this.normalizeUpdateData(dto);
    return mutateTemplateStructure(
      this.prismaService,
      { kind: 'stage', id },
      async (tx) => {
        const current = await this.findById(id, tx);
        if (typeof data.stage_order === 'number') {
          await this.ensureStageOrderAvailable(
            current.survey_template_id,
            data.stage_order,
            id,
            tx,
          );
        }
        const updated = await tx.surveyTemplateStages.update({
          where: { id },
          data,
          include: surveyTemplateStageInclude,
        });
        return {
          ...updated,
          siblings: await this.findSiblings(tx, current.survey_template_id),
        };
      },
    );
  }

  async delete(id: number) {
    return mutateTemplateStructure(
      this.prismaService,
      { kind: 'stage', id },
      async (tx) => {
        const current = await this.findById(id, tx);
        const deleted = await tx.surveyTemplateStages.delete({
          where: { id },
          include: surveyTemplateStageInclude,
        });
        const remaining = await this.findSiblings(
          tx,
          current.survey_template_id,
        );
        await compactTemplateOrders(
          remaining.map((node) => ({ id: node.id, order: node.stage_order })),
          (nodeId, order) =>
            tx.surveyTemplateStages.update({
              where: { id: nodeId },
              data: { stage_order: order },
            }),
        );
        return {
          ...deleted,
          siblings: await this.findSiblings(tx, current.survey_template_id),
        };
      },
    );
  }

  async move(id: number, direction: unknown) {
    validateMoveDirection(direction);
    return mutateTemplateStructure(
      this.prismaService,
      { kind: 'stage', id },
      async (tx) => {
        const current = await this.findById(id, tx);
        const siblings = await this.findSiblings(
          tx,
          current.survey_template_id,
        );
        await moveTemplateNode(
          siblings.map((node) => ({ id: node.id, order: node.stage_order })),
          id,
          direction,
          (nodeId, order) =>
            tx.surveyTemplateStages.update({
              where: { id: nodeId },
              data: { stage_order: order },
            }),
        );
        return {
          ...(await this.findById(id, tx)),
          siblings: await this.findSiblings(tx, current.survey_template_id),
        };
      },
    );
  }

  async duplicate(id: number, user?: AuthenticatedUser) {
    const userId = this.normalizeUserId(user);
    return mutateTemplateStructure(
      this.prismaService,
      { kind: 'stage', id },
      async (tx) => {
        const source = await tx.surveyTemplateStages.findUnique({
          where: { id },
          include: {
            ...surveyTemplateStageInclude,
            steps: {
              orderBy: { step_order: 'asc' as const },
              include: {
                createdBy: { select: creatorSelect },
                parameters: {
                  orderBy: { parameter_order: 'asc' as const },
                  include: { createdBy: { select: creatorSelect } },
                },
              },
            },
          },
        });
        if (!source)
          throw new NotFoundException('Survey template stage not found');
        const siblings = await this.findSiblings(tx, source.survey_template_id);
        const order = source.stage_order + 1;
        await shiftTemplateOrdersForInsert(
          siblings.map((node) => ({ id: node.id, order: node.stage_order })),
          order,
          (nodeId, nextOrder) =>
            tx.surveyTemplateStages.update({
              where: { id: nodeId },
              data: { stage_order: nextOrder },
            }),
        );
        const created = await tx.surveyTemplateStages.create({
          data: {
            survey_template_id: source.survey_template_id,
            stage_name: source.stage_name,
            steps: {
              create: source.steps.map((step) => ({
                step_name: step.step_name,
                step_order: step.step_order,
                created_by_id: userId,
                parameters: {
                  create: step.parameters.map((parameter) => ({
                    parameter_name: parameter.parameter_name,
                    data_type: parameter.data_type,
                    unit: parameter.unit,
                    requirement: parameter.requirement,
                    parameter_order: parameter.parameter_order,
                    created_by_id: userId,
                  })),
                },
              })),
            },
            stage_order: order,
            created_by_id: userId,
          },
          include: {
            ...surveyTemplateStageInclude,
            steps: {
              orderBy: { step_order: 'asc' as const },
              include: {
                createdBy: { select: creatorSelect },
                parameters: {
                  orderBy: { parameter_order: 'asc' as const },
                  include: { createdBy: { select: creatorSelect } },
                },
              },
            },
          },
        });
        return {
          ...created,
          siblings: await this.findSiblings(tx, source.survey_template_id),
        };
      },
    );
  }

  private findSiblings(tx: Prisma.TransactionClient, parentId: number) {
    return tx.surveyTemplateStages.findMany({
      where: { survey_template_id: parentId },
      include: surveyTemplateStageInclude,
      orderBy: [{ stage_order: 'asc' }, { id: 'asc' }],
    });
  }

  private normalizeUpdateData(dto: UpdateSurveyTemplateStageDto) {
    const updateDto = dto ?? {};
    const data: Prisma.SurveyTemplateStagesUpdateInput = {};

    if ('stage_name' in updateDto) {
      data.stage_name = this.normalizeStageName(updateDto.stage_name);
    }

    if ('stage_order' in updateDto) {
      data.stage_order = this.normalizePositiveInteger(
        updateDto.stage_order,
        'stage_order',
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private normalizeStageName(value: unknown) {
    if (value === null || value === undefined) {
      throw new BadRequestException('stage_name is required');
    }

    const normalizedValue = (
      typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : ''
    ).trim();
    if (!normalizedValue) {
      throw new BadRequestException('stage_name is required');
    }

    if (normalizedValue.length > 255) {
      throw new BadRequestException(
        'stage_name must not exceed 255 characters',
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

  private async ensureTemplateExists(
    templateId: number,
    client: Prisma.TransactionClient = this.prismaService,
  ) {
    const template = await client.surveyTemplates.findUnique({
      where: { id: templateId },
      select: { id: true },
    });

    if (!template) {
      throw new NotFoundException('Survey template not found');
    }
  }

  private async ensureStageOrderAvailable(
    templateId: number,
    stageOrder: number,
    excludedStageId?: number,
    client: Prisma.TransactionClient = this.prismaService,
  ) {
    const existing = await client.surveyTemplateStages.findUnique({
      where: {
        survey_template_id_stage_order: {
          survey_template_id: templateId,
          stage_order: stageOrder,
        },
      },
      select: { id: true },
    });

    if (existing && existing.id !== excludedStageId) {
      throw new ConflictException(
        'Stage order already exists for this survey template',
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
