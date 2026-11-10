import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';

type StructureReference = {
  kind: 'template' | 'stage' | 'step' | 'parameter';
  id: number;
};
export type OrderedTemplateNode = { id: number; order: number };
type WriteOrder = (id: number, order: number) => Promise<unknown>;

async function resolveTemplateId(
  tx: Prisma.TransactionClient,
  ref: StructureReference,
) {
  if (!Number.isInteger(ref.id) || ref.id <= 0) {
    throw new BadRequestException('ID must be a positive integer');
  }
  if (ref.kind === 'template') return ref.id;
  if (ref.kind === 'stage') {
    const stage = await tx.surveyTemplateStages.findUnique({
      where: { id: ref.id },
      select: { survey_template_id: true },
    });
    if (!stage) throw new NotFoundException('Survey template stage not found');
    return stage.survey_template_id;
  }
  if (ref.kind === 'step') {
    const step = await tx.surveyTemplateSteps.findUnique({
      where: { id: ref.id },
      select: { surveyTemplateStage: { select: { survey_template_id: true } } },
    });
    if (!step) throw new NotFoundException('Survey template step not found');
    return step.surveyTemplateStage.survey_template_id;
  }
  const parameter = await tx.surveyTemplateParameters.findUnique({
    where: { id: ref.id },
    select: {
      surveyTemplateStep: {
        select: {
          surveyTemplateStage: { select: { survey_template_id: true } },
        },
      },
    },
  });
  if (!parameter)
    throw new NotFoundException('Survey template parameter not found');
  return parameter.surveyTemplateStep.surveyTemplateStage.survey_template_id;
}

/** Serialize writes within a template, including edits to a duplicated subtree. */
export async function mutateTemplateStructure<T>(
  prisma: PrismaService,
  ref: StructureReference,
  mutation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const templateId = await resolveTemplateId(tx, ref);
        const locked = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM survey_templates WHERE id = ${templateId} FOR UPDATE
      `;
        if (locked.length === 0)
          throw new NotFoundException('Survey template not found');
        return mutation(tx);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 30000,
      },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2002' || error.code === 'P2034')
    ) {
      throw new ConflictException(
        'Template structure changed concurrently. Please retry.',
      );
    }
    throw error;
  }
}

export function validateMoveDirection(
  direction: unknown,
): asserts direction is 'up' | 'down' {
  if (direction !== 'up' && direction !== 'down') {
    throw new BadRequestException('direction must be up or down');
  }
}

export async function shiftTemplateOrdersForInsert(
  nodes: OrderedTemplateNode[],
  order: number,
  write: WriteOrder,
) {
  const shifted = nodes
    .filter((node) => node.order >= order)
    .sort((a, b) => b.order - a.order);
  if (order > 2147483647 || shifted.some((node) => node.order === 2147483647)) {
    throw new BadRequestException('Order exceeds the supported range');
  }
  for (const node of shifted) await write(node.id, node.order + 1);
}

export async function compactTemplateOrders(
  nodes: OrderedTemplateNode[],
  write: WriteOrder,
) {
  const sorted = [...nodes].sort((a, b) => a.order - b.order);
  for (const [index, node] of sorted.entries()) {
    if (node.order !== index + 1) await write(node.id, index + 1);
  }
}

export async function moveTemplateNode(
  nodes: OrderedTemplateNode[],
  id: number,
  direction: 'up' | 'down',
  write: WriteOrder,
) {
  const sorted = [...nodes].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((node) => node.id === id);
  if (index === -1) throw new NotFoundException('Template node not found');
  const current = sorted[index];
  const adjacent = sorted[index + (direction === 'up' ? -1 : 1)];
  if (!adjacent) return;
  // Zero is reserved inside the transaction; public orders are positive.
  await write(current.id, 0);
  await write(adjacent.id, current.order);
  await write(current.id, adjacent.order);
}
