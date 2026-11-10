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
import { CreateSurveyTemplateStepDto } from './dto/create-survey-template-step.dto';
import { UpdateSurveyTemplateStepDto } from './dto/update-survey-template-step.dto';

type AuthenticatedUser = { id?: number | string | null };

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
};

const surveyTemplateStepInclude = {
  createdBy: { select: creatorSelect },
} satisfies Prisma.SurveyTemplateStepsInclude;

@Injectable()
export class SurveyTemplateStepsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAllByStage(stageId: number) {
    const normalizedStageId = this.normalizePositiveInteger(stageId, 'stageId');
    await this.ensureStageExists(normalizedStageId);

    return this.prismaService.surveyTemplateSteps.findMany({
      where: { survey_template_stage_id: normalizedStageId },
      include: surveyTemplateStepInclude,
      orderBy: [{ step_order: 'asc' }, { id: 'asc' }],
    });
  }

  async findById(
    id: number,
    client: Prisma.TransactionClient = this.prismaService,
  ) {
    const step = await client.surveyTemplateSteps.findUnique({
      where: { id },
      include: surveyTemplateStepInclude,
    });

    if (!step) {
      throw new NotFoundException('Survey template step not found');
    }

    return step;
  }

  async create(
    stageId: number,
    dto: CreateSurveyTemplateStepDto,
    user?: AuthenticatedUser,
  ) {
    const parentId = this.normalizePositiveInteger(stageId, 'stageId');
    const order = this.normalizePositiveInteger(dto?.step_order, 'step_order');
    const userId = this.normalizeUserId(user);
    return mutateTemplateStructure(
      this.prismaService,
      { kind: 'stage', id: parentId },
      async (tx) => {
        await this.ensureStageExists(parentId, tx);
        await this.ensureStepOrderAvailable(parentId, order, undefined, tx);
        const created = await tx.surveyTemplateSteps.create({
          data: {
            survey_template_stage_id: parentId,
            step_name: this.normalizeStepName(dto?.step_name),
            step_order: order,
            created_by_id: userId,
          },
          include: surveyTemplateStepInclude,
        });
        return {
          ...created,
          parameters: [],
          siblings: await this.findSiblings(tx, parentId),
        };
      },
    );
  }

  async update(id: number, dto: UpdateSurveyTemplateStepDto) {
    const data = this.normalizeUpdateData(dto);
    return mutateTemplateStructure(
      this.prismaService,
      { kind: 'step', id },
      async (tx) => {
        const current = await this.findById(id, tx);
        if (typeof data.step_order === 'number') {
          await this.ensureStepOrderAvailable(
            current.survey_template_stage_id,
            data.step_order,
            id,
            tx,
          );
        }
        const updated = await tx.surveyTemplateSteps.update({
          where: { id },
          data,
          include: surveyTemplateStepInclude,
        });
        return {
          ...updated,
          siblings: await this.findSiblings(
            tx,
            current.survey_template_stage_id,
          ),
        };
      },
    );
  }

  async delete(id: number) {
    return mutateTemplateStructure(
      this.prismaService,
      { kind: 'step', id },
      async (tx) => {
        const current = await this.findById(id, tx);
        const deleted = await tx.surveyTemplateSteps.delete({
          where: { id },
          include: surveyTemplateStepInclude,
        });
        const remaining = await this.findSiblings(
          tx,
          current.survey_template_stage_id,
        );
        await compactTemplateOrders(
          remaining.map((node) => ({ id: node.id, order: node.step_order })),
          (nodeId, order) =>
            tx.surveyTemplateSteps.update({
              where: { id: nodeId },
              data: { step_order: order },
            }),
        );
        return {
          ...deleted,
          siblings: await this.findSiblings(
            tx,
            current.survey_template_stage_id,
          ),
        };
      },
    );
  }

  async move(id: number, direction: unknown) {
    validateMoveDirection(direction);
    return mutateTemplateStructure(
      this.prismaService,
      { kind: 'step', id },
      async (tx) => {
        const current = await this.findById(id, tx);
        const siblings = await this.findSiblings(
          tx,
          current.survey_template_stage_id,
        );
        await moveTemplateNode(
          siblings.map((node) => ({ id: node.id, order: node.step_order })),
          id,
          direction,
          (nodeId, order) =>
            tx.surveyTemplateSteps.update({
              where: { id: nodeId },
              data: { step_order: order },
            }),
        );
        return {
          ...(await this.findById(id, tx)),
          siblings: await this.findSiblings(
            tx,
            current.survey_template_stage_id,
          ),
        };
      },
    );
  }

  async duplicate(id: number, user?: AuthenticatedUser) {
    const userId = this.normalizeUserId(user);
    return mutateTemplateStructure(
      this.prismaService,
      { kind: 'step', id },
      async (tx) => {
        const source = await tx.surveyTemplateSteps.findUnique({
          where: { id },
          include: {
            ...surveyTemplateStepInclude,
            parameters: {
              orderBy: { parameter_order: 'asc' as const },
              include: { createdBy: { select: creatorSelect } },
            },
          },
        });
        if (!source)
          throw new NotFoundException('Survey template step not found');
        const siblings = await this.findSiblings(
          tx,
          source.survey_template_stage_id,
        );
        const order = source.step_order + 1;
        await shiftTemplateOrdersForInsert(
          siblings.map((node) => ({ id: node.id, order: node.step_order })),
          order,
          (nodeId, nextOrder) =>
            tx.surveyTemplateSteps.update({
              where: { id: nodeId },
              data: { step_order: nextOrder },
            }),
        );
        const created = await tx.surveyTemplateSteps.create({
          data: {
            survey_template_stage_id: source.survey_template_stage_id,
            step_name: source.step_name,
            parameters: {
              create: source.parameters.map((parameter) => ({
                parameter_name: parameter.parameter_name,
                data_type: parameter.data_type,
                unit: parameter.unit,
                requirement: parameter.requirement,
                parameter_order: parameter.parameter_order,
                created_by_id: userId,
              })),
            },
            step_order: order,
            created_by_id: userId,
          },
          include: {
            ...surveyTemplateStepInclude,
            parameters: {
              orderBy: { parameter_order: 'asc' as const },
              include: { createdBy: { select: creatorSelect } },
            },
          },
        });
        return {
          ...created,
          siblings: await this.findSiblings(
            tx,
            source.survey_template_stage_id,
          ),
        };
      },
    );
  }

  private findSiblings(tx: Prisma.TransactionClient, parentId: number) {
    return tx.surveyTemplateSteps.findMany({
      where: { survey_template_stage_id: parentId },
      include: surveyTemplateStepInclude,
      orderBy: [{ step_order: 'asc' }, { id: 'asc' }],
    });
  }

  private normalizeUpdateData(dto: UpdateSurveyTemplateStepDto) {
    const updateDto = dto ?? {};
    const data: Prisma.SurveyTemplateStepsUpdateInput = {};

    if ('step_name' in updateDto) {
      data.step_name = this.normalizeStepName(updateDto.step_name);
    }

    if ('step_order' in updateDto) {
      data.step_order = this.normalizePositiveInteger(
        updateDto.step_order,
        'step_order',
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private normalizeStepName(value: unknown) {
    if (value === null || value === undefined) {
      throw new BadRequestException('step_name is required');
    }

    const normalizedValue = (
      typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : ''
    ).trim();
    if (!normalizedValue) {
      throw new BadRequestException('step_name is required');
    }

    if (normalizedValue.length > 255) {
      throw new BadRequestException('step_name must not exceed 255 characters');
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

  private async ensureStageExists(
    stageId: number,
    client: Prisma.TransactionClient = this.prismaService,
  ) {
    const stage = await client.surveyTemplateStages.findUnique({
      where: { id: stageId },
      select: { id: true },
    });

    if (!stage) {
      throw new NotFoundException('Survey template stage not found');
    }
  }

  private async ensureStepOrderAvailable(
    stageId: number,
    stepOrder: number,
    excludedStepId?: number,
    client: Prisma.TransactionClient = this.prismaService,
  ) {
    const existing = await client.surveyTemplateSteps.findUnique({
      where: {
        survey_template_stage_id_step_order: {
          survey_template_stage_id: stageId,
          step_order: stepOrder,
        },
      },
      select: { id: true },
    });

    if (existing && existing.id !== excludedStepId) {
      throw new ConflictException(
        'Step order already exists for this survey template stage',
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
