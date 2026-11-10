"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { UpdateSurveyTemplateStepPayload } from "@/features/survey-templates/types";
import {
  compactUniqueOrdersAfterDelete,
  swapUniqueOrders,
} from "../swap-unique-orders";
import surveyRecordsService from "@/services/survey-records.service";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  SurveyRecordStage,
  SurveyRecordStep,
} from "../types";
import { getStageSteps } from "../utils";
import SurveyRecordStepEditor from "./survey-record-step-editor";

type StepFormState = {
  stepName: string;
  stepOrder: string;
};

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join("; ") : message ?? fallback;
};

export default function SurveyRecordStageEditor({
  stage,
  createStepRequestId,
  disabled,
  parameterEntryDisabled,
  onChanged,
}: {
  stage: SurveyRecordStage;
  createStepRequestId: number;
  disabled: boolean;
  parameterEntryDisabled: boolean;
  onChanged: () => Promise<unknown>;
}) {
  const steps = useMemo(() => getStageSteps(stage), [stage]);
  const [isEditingRow, setIsEditingRow] = useState(false);
  const [editingStep, setEditingStep] =
    useState<SurveyRecordStep | null>(null);
  const [deletingStep, setDeletingStep] =
    useState<SurveyRecordStep | null>(null);
  const [form, setForm] = useState<StepFormState>({
    stepName: "",
    stepOrder: "1",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handledCreateRequestId = useRef(0);

  useEffect(() => {
    if (
      !createStepRequestId ||
      handledCreateRequestId.current === createStepRequestId
    ) {
      return;
    }
    const nextOrder =
      steps.reduce(
        (highestOrder, step) => Math.max(highestOrder, step.step_order),
        0,
      ) + 1;
    handledCreateRequestId.current = createStepRequestId;
    setEditingStep(null);
    setForm({ stepName: "", stepOrder: String(nextOrder) });
    setIsEditingRow(true);
  }, [createStepRequestId, steps]);

  const closeEditor = () => {
    setIsEditingRow(false);
    setEditingStep(null);
  };

  const openEditForm = (step: SurveyRecordStep) => {
    setEditingStep(step);
    setForm({
      stepName: step.step_name,
      stepOrder: String(step.step_order),
    });
    setIsEditingRow(true);
  };

  const validateForm = () => {
    const stepName = form.stepName.trim();
    const stepOrder = Number(form.stepOrder);
    if (!stepName) {
      toast.error("Vui lòng nhập tên bước.");
      return false;
    }
    if (stepName.length > 255) {
      toast.error("Tên bước tối đa 255 ký tự.");
      return false;
    }
    if (!Number.isInteger(stepOrder) || stepOrder <= 0) {
      toast.error("Thứ tự bước phải là số nguyên dương.");
      return false;
    }
    if (
      steps.some(
        (step) => step.id !== editingStep?.id && step.step_order === stepOrder,
      )
    ) {
      toast.error("Thứ tự này đã được sử dụng trong giai đoạn.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;
    const nextValues = {
      step_name: form.stepName.trim(),
      step_order: Number(form.stepOrder),
    };
    setIsSubmitting(true);
    try {
      if (editingStep) {
        const payload: UpdateSurveyTemplateStepPayload = {};
        if (nextValues.step_name !== editingStep.step_name) {
          payload.step_name = nextValues.step_name;
        }
        if (nextValues.step_order !== editingStep.step_order) {
          payload.step_order = nextValues.step_order;
        }
        if (Object.keys(payload).length > 0) {
          await surveyRecordsService.updateStep(
            editingStep.id,
            payload,
          );
          toast.success("Đã cập nhật bước trong phiếu khảo sát.");
        }
      } else {
        await surveyRecordsService.createStep(stage.id, nextValues);
        toast.success("Đã thêm bước vào phiếu khảo sát.");
      }
      closeEditor();
      await onChanged();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          editingStep ? "Không thể cập nhật bước." : "Không thể thêm bước.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStep) return;
    let wasDeleted = false;
    setIsSubmitting(true);
    try {
      await surveyRecordsService.deleteStep(deletingStep.id);
      wasDeleted = true;
      setDeletingStep(null);
      await compactUniqueOrdersAfterDelete({
        deletedItemId: deletingStep.id,
        orderedItems: steps.map((step) => ({
          id: step.id,
          order: step.step_order,
        })),
        updateOrder: (id, order) =>
          surveyRecordsService.updateStep(id, {
            step_order: order,
          }),
      });
      toast.success("Đã xóa bước khỏi phiếu khảo sát.");
      await onChanged();
    } catch (error) {
      if (wasDeleted) {
        await onChanged().catch(() => undefined);
        toast.error("Đã xóa bước, nhưng không thể cập nhật lại thứ tự.");
        return;
      }
      toast.error(getErrorMessage(error, "Không thể xóa bước."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveStep = async (
    step: SurveyRecordStep,
    direction: "up" | "down",
  ) => {
    const currentIndex = steps.findIndex((item) => item.id === step.id);
    const adjacentIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const adjacentStep = steps[adjacentIndex];
    if (!adjacentStep) return;
    const temporaryOrder =
      steps.reduce(
        (highestOrder, item) => Math.max(highestOrder, item.step_order),
        0,
      ) + 1;
    setIsSubmitting(true);
    try {
      await swapUniqueOrders({
        itemId: step.id,
        itemOrder: step.step_order,
        adjacentId: adjacentStep.id,
        adjacentOrder: adjacentStep.step_order,
        temporaryOrder,
        updateOrder: (id, order) =>
          surveyRecordsService.updateStep(id, {
            step_order: order,
          }),
      });
      toast.success(
        direction === "up"
          ? "Đã di chuyển bước lên trên."
          : "Đã di chuyển bước xuống dưới.",
      );
      await onChanged();
    } catch (error) {
      await onChanged();
      toast.error(getErrorMessage(error, "Không thể thay đổi thứ tự bước."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEditorRow = (key: string | number) => (
    <tr key={key}>
      <td colSpan={6} className="h-11 border border-black bg-amber-50/50 px-2 py-1">
        <form
          className="flex items-start gap-2"
          onSubmit={handleSubmit}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !isSubmitting) {
              event.preventDefault();
              closeEditor();
            }
          }}
        >
          <span className="shrink-0 font-medium">Bước</span>
          <Input
            type="number"
            min="1"
            step="1"
            value={form.stepOrder}
            disabled={isSubmitting}
            className="h-8 w-16 shrink-0 rounded-sm border-black bg-white px-2 text-center font-serif text-[15px]"
            aria-label="Thứ tự bước"
            onChange={(event) =>
              setForm((current) => ({ ...current, stepOrder: event.target.value }))
            }
          />
          <span className="shrink-0 font-medium">:</span>
          <Textarea
            value={form.stepName}
            maxLength={255}
            disabled={isSubmitting}
            placeholder="Nhập tên bước"
            autoFocus
            rows={1}
            className="min-h-8 min-w-0 flex-1 resize-none overflow-hidden rounded-sm border-black bg-white px-2 py-1 font-serif text-[15px] leading-6"
            onChange={(event) =>
              setForm((current) => ({ ...current, stepName: event.target.value }))
            }
          />
          <Button type="submit" size="sm" className="h-8" disabled={isSubmitting}>
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            disabled={isSubmitting}
            onClick={closeEditor}
          >
            Hủy
          </Button>
        </form>
      </td>
    </tr>
  );

  return (
    <>
      {steps.map((step, index) =>
        isEditingRow && editingStep?.id === step.id ? (
          renderEditorRow(step.id)
        ) : (
          <SurveyRecordStepEditor
            key={step.id}
            step={step}
            disabled={disabled || isEditingRow || isSubmitting}
            parameterEntryDisabled={parameterEntryDisabled}
            canMoveUp={index > 0}
            canMoveDown={index < steps.length - 1}
            onEditStep={() => openEditForm(step)}
            onDeleteStep={() => setDeletingStep(step)}
            onMoveStepUp={() => void moveStep(step, "up")}
            onMoveStepDown={() => void moveStep(step, "down")}
            onChanged={onChanged}
          />
        ),
      )}
      {isEditingRow && !editingStep
        ? renderEditorRow(`new-step-${stage.id}`)
        : null}

      <Dialog
        open={Boolean(deletingStep)}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setDeletingStep(null);
        }}
      >
        <DialogContent className="font-sans">
          <DialogHeader>
            <DialogTitle>Xóa bước</DialogTitle>
            <DialogDescription>
              Bước và toàn bộ thông số con sẽ bị xóa khỏi phiếu khảo sát.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3">
            Bước {deletingStep?.step_order}: {deletingStep?.step_name}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setDeletingStep(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmitting}
              onClick={() => void handleDelete()}
            >
              {isSubmitting ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
