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
  CopySurveyTemplateDto,
  CreateSurveyTemplateDto,
  UpdateSurveyTemplateDto,
} from './dto/survey-template.dto';

type AuthenticatedUser = { id?: number | string | null };

const ACTIVE_STATUS = 'active';
const INACTIVE_STATUS = 'inactive';

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
};

const surveyTemplateInclude = {
  createdBy: { select: creatorSelect },
} satisfies Prisma.SurveyTemplatesInclude;

const surveyTemplateTreeInclude = {
  ...surveyTemplateInclude,
  stages: {
    orderBy: [{ stage_order: 'asc' }, { id: 'asc' }],
    include: {
      createdBy: { select: creatorSelect },
      steps: {
        orderBy: [{ step_order: 'asc' }, { id: 'asc' }],
        include: {
          createdBy: { select: creatorSelect },
          parameters: {
            orderBy: [{ parameter_order: 'asc' }, { id: 'asc' }],
            include: { createdBy: { select: creatorSelect } },
          },
        },
      },
    },
  },
} satisfies Prisma.SurveyTemplatesInclude;

@Injectable()
export class SurveyTemplatesService {
  constructor(private readonly prismaService: PrismaService) {}

  findAll() {
    return this.prismaService.surveyTemplates.findMany({
      include: surveyTemplateInclude,
      orderBy: [{ code: 'asc' }, { version: 'desc' }, { id: 'desc' }],
    });
  }

  async findById(id: number, includeTree = true) {
    const template = await this.prismaService.surveyTemplates.findUnique({
      where: { id },
      include: includeTree ? surveyTemplateTreeInclude : surveyTemplateInclude,
    });

    if (!template) {
      throw new NotFoundException('Survey template not found');
    }

    return template;
  }

  async create(dto: CreateSurveyTemplateDto, user?: AuthenticatedUser) {
    const code = this.normalizeRequiredString(dto?.code, 'code', 50);
    const version = this.normalizePositiveInteger(dto?.version ?? 1, 'version');
    await this.ensureCodeVersionAvailable(code, version);

    return this.withUniqueGuard(() =>
      this.prismaService.surveyTemplates.create({
        data: {
          code,
          name: this.normalizeRequiredString(dto?.name, 'name', 255),
          version,
          description: this.normalizeDescription(dto?.description),
          status: ACTIVE_STATUS,
          created_by_id: this.normalizeUserId(user),
        },
        include: surveyTemplateInclude,
      }),
    );
  }

  /** Copies a template with its whole stage/step/parameter tree. */
  async copyFromTemplate(dto: CopySurveyTemplateDto, user?: AuthenticatedUser) {
    const sourceTemplateId = this.normalizePositiveInteger(
      dto?.source_template_id,
      'source_template_id',
    );
    const userId = this.normalizeUserId(user);

    return this.withUniqueGuard(() =>
      this.prismaService.$transaction(
        async (tx) => {
          const source = await tx.surveyTemplates.findUnique({
            where: { id: sourceTemplateId },
            include: {
              stages: {
                orderBy: { stage_order: 'asc' },
                include: {
                  steps: {
                    orderBy: { step_order: 'asc' },
                    include: {
                      parameters: { orderBy: { parameter_order: 'asc' } },
                    },
                  },
                },
              },
            },
          });
          if (!source) {
            throw new NotFoundException('Source survey template not found');
          }

          const code = this.normalizeRequiredString(
            dto.code === undefined ? source.code : dto.code,
            'code',
            50,
          );
          const latestVersion =
            dto.version == null
              ? await tx.surveyTemplates.aggregate({
                  where: { code },
                  _max: { version: true },
                })
              : null;
          const version = this.normalizePositiveInteger(
            dto.version ?? (latestVersion?._max.version ?? 0) + 1,
            'version',
          );
          await this.ensureCodeVersionAvailable(code, version, undefined, tx);

          // A nested create writes the entire tree atomically with new IDs.
          return tx.surveyTemplates.create({
            data: {
              code,
              name: this.normalizeRequiredString(
                dto.name === undefined ? source.name : dto.name,
                'name',
                255,
              ),
              version,
              description: this.normalizeDescription(
                dto.description === undefined
                  ? source.description
                  : dto.description,
              ),
              status: ACTIVE_STATUS,
              created_by_id: userId,
              stages: {
                create: source.stages.map((stage) => ({
                  stage_name: stage.stage_name,
                  stage_order: stage.stage_order,
                  created_by_id: userId,
                  steps: {
                    create: stage.steps.map((step) => ({
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
                })),
              },
            },
            include: surveyTemplateInclude,
          });
        },
        { timeout: 30000 },
      ),
    );
  }

  async update(id: number, dto: UpdateSurveyTemplateDto) {
    const current = await this.findById(id, false);
    const data = this.normalizeUpdateData(dto);

    if (data.code !== undefined || data.version !== undefined) {
      await this.ensureCodeVersionAvailable(
        (data.code as string | undefined) ?? current.code,
        (data.version as number | undefined) ?? current.version,
        id,
      );
    }

    return this.withUniqueGuard(() =>
      this.prismaService.surveyTemplates.update({
        where: { id },
        data,
        include: surveyTemplateInclude,
      }),
    );
  }

  async delete(id: number) {
    await this.findById(id, false);

    return this.prismaService.surveyTemplates.delete({
      where: { id },
      include: surveyTemplateInclude,
    });
  }

  private normalizeUpdateData(dto: UpdateSurveyTemplateDto) {
    const updateDto = dto ?? {};
    const data: Prisma.SurveyTemplatesUpdateInput = {};

    if ('code' in updateDto) {
      data.code = this.normalizeRequiredString(updateDto.code, 'code', 50);
    }
    if ('name' in updateDto) {
      data.name = this.normalizeRequiredString(updateDto.name, 'name', 255);
    }
    if ('version' in updateDto) {
      data.version = this.normalizePositiveInteger(
        updateDto.version,
        'version',
      );
    }
    if ('description' in updateDto) {
      data.description = this.normalizeDescription(updateDto.description);
    }
    if ('status' in updateDto) {
      data.status = this.normalizeStatus(updateDto.status);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private async ensureCodeVersionAvailable(
    code: string,
    version: number,
    excludedId?: number,
    client: Pick<Prisma.TransactionClient, 'surveyTemplates'> = this
      .prismaService,
  ) {
    const existing = await client.surveyTemplates.findUnique({
      where: { code_version: { code, version } },
      select: { id: true },
    });
    if (existing && existing.id !== excludedId) {
      throw new ConflictException(
        'A survey template with this code and version already exists',
      );
    }
  }

  /** Turns a race on the (code, version) unique key into a 409. */
  private async withUniqueGuard<T>(action: () => Promise<T>) {
    try {
      return await action();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A survey template with this code and version already exists',
        );
      }
      throw error;
    }
  }

  private normalizePositiveInteger(value: unknown, fieldName: string) {
    const normalizedValue = Number(value);

    if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return normalizedValue;
  }

  private normalizeRequiredString(
    value: unknown,
    fieldName: string,
    maxLength: number,
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

    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${maxLength} characters`,
      );
    }

    return normalizedValue;
  }

  private normalizeDescription(value: unknown) {
    if (value === null || value === undefined) {
      return null;
    }

    const normalizedValue = (
      typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : ''
    ).trim();
    return normalizedValue || null;
  }

  private normalizeStatus(value: unknown) {
    const normalizedValue =
      typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (
      normalizedValue !== ACTIVE_STATUS &&
      normalizedValue !== INACTIVE_STATUS
    ) {
      throw new BadRequestException('status must be active or inactive');
    }

    return normalizedValue;
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
