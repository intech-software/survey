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
import {
  surveyTemplateStepsService,
} from "@/services/index.service";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useTemplateTree } from "./template-tree-context";
import { applyStepMutation } from "../tree-cache";
import type {
  SurveyTemplateStepMutation,
  SurveyTemplateStep,
  UpdateSurveyTemplateStepPayload,
} from "../types";
import SurveyTemplateStepBlock from "./survey-template-step-block";

type StepFormState = {
  stepName: string;
  stepOrder: string;
};

const EMPTY_DATA: SurveyTemplateStep[] = [];

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join("; ") : message ?? fallback;
};

export default function SurveyTemplateSteps({
  stageId,
  createRequestId,
}: {
  stageId: number;
  createRequestId: number;
}) {
  const [isEditingRow, setIsEditingRow] = useState(false);
  const [editingStep, setEditingStep] =
    useState<SurveyTemplateStep | null>(null);
  const [deletingStep, setDeletingStep] =
    useState<SurveyTemplateStep | null>(null);
  const [form, setForm] = useState<StepFormState>({
    stepName: "",
    stepOrder: "1",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInFlight = useRef(false);
  const { template, mutate, error, isLoading } = useTemplateTree();
  const handledCreateRequestId = useRef(0);
  const data =
    template?.stages.find((stage) => stage.id === stageId)?.steps ?? EMPTY_DATA;

  const steps = useMemo(
    () => [...data].sort((first, second) => first.step_order - second.step_order),
    [data],
  );

  useEffect(() => {
    if (
      !createRequestId ||
      isLoading ||
      handledCreateRequestId.current === createRequestId
    ) {
      return;
    }

    const nextOrder =
      steps.reduce(
        (highestOrder, step) => Math.max(highestOrder, step.step_order),
        0,
      ) + 1;
    handledCreateRequestId.current = createRequestId;
    setEditingStep(null);
    setForm({ stepName: "", stepOrder: String(nextOrder) });
    setIsEditingRow(true);
  }, [createRequestId, isLoading, steps]);

  const closeEditor = () => {
    setIsEditingRow(false);
    setEditingStep(null);
  };

  const openEditForm = (step: SurveyTemplateStep) => {
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
        (step) =>
          step.id !== editingStep?.id && step.step_order === stepOrder,
      )
    ) {
      toast.error("Thứ tự này đã được sử dụng trong giai đoạn.");
      return false;
    }
    return true;
  };

  const applyMutation = async (result: SurveyTemplateStepMutation) => {
    await mutate(
      (current) => current ? applyStepMutation(current, stageId, result) : current,
      { revalidate: false },
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionInFlight.current || !validateForm()) return;

    const nextValues = {
      step_name: form.stepName.trim(),
      step_order: Number(form.stepOrder),
    };

    submissionInFlight.current = true;
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
          const result = await surveyTemplateStepsService.update(
            editingStep.id,
            payload,
          );
          await applyMutation(result);
          toast.success("Đã cập nhật bước.");
        }
      } else {
        const result = await surveyTemplateStepsService.create(stageId, nextValues);
        await applyMutation(result);
        toast.success("Đã thêm bước.");
      }

      closeEditor();
    } catch (submitError) {
      toast.error(
        getErrorMessage(
          submitError,
          editingStep
            ? "Không thể cập nhật bước."
            : "Không thể thêm bước.",
        ),
      );
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (submissionInFlight.current || !deletingStep) return;
    submissionInFlight.current = true;
    setIsSubmitting(true);
    try {
      const result = await surveyTemplateStepsService.delete(deletingStep.id);
      await applyMutation(result);
      setDeletingStep(null);
      toast.success("Đã xóa bước.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa bước."));
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const moveStep = async (step: SurveyTemplateStep, direction: "up" | "down") => {
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    setIsSubmitting(true);
    try {
      const result = await surveyTemplateStepsService.move(step.id, direction);
      await applyMutation(result);
      toast.success(direction === "up" ? "Đã di chuyển lên trên." : "Đã di chuyển xuống dưới.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể thay đổi thứ tự bước."));
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const duplicateStep = async (step: SurveyTemplateStep) => {
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    setIsSubmitting(true);
    try {
      const result = await surveyTemplateStepsService.duplicate(step.id);
      await applyMutation(result);
      toast.success("Đã nhân bản bước xuống ngay phía dưới.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể nhân bản bước."));
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const renderEditorRow = (key: string | number) => (
    <tr key={key}>
      <td
        colSpan={4}
        className="h-11 border border-black bg-amber-50/50 px-2 py-1 align-middle"
      >
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
            inputMode="numeric"
            value={form.stepOrder}
            disabled={isSubmitting}
            className="h-8 w-16 shrink-0 rounded-sm border-black bg-white px-2 text-center font-serif text-[15px]"
            aria-label="Thứ tự bước"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                stepOrder: event.target.value,
              }))
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
            aria-label="Tên bước"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                stepName: event.target.value,
              }))
            }
          />
          <Button
            type="submit"
            size="sm"
            className="h-8 shrink-0 font-sans"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 font-sans"
            onClick={closeEditor}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
        </form>
      </td>
    </tr>
  );

  return (
    <>
      {error ? (
        <tr>
          <td
            colSpan={4}
            className="h-9 border border-black px-2 py-1 text-center text-sm text-red-700"
          >
            {getErrorMessage(error, "Không thể tải danh sách bước.")}
          </td>
        </tr>
      ) : isLoading ? (
        <tr>
          <td
            colSpan={4}
            className="h-9 animate-pulse border border-black bg-gray-50 px-2 py-1 text-center text-sm text-gray-500"
          >
            Đang tải các bước...
          </td>
        </tr>
      ) : (
        <>
          {steps.map((step, index) =>
            isEditingRow && editingStep?.id === step.id ? (
              renderEditorRow(step.id)
            ) : (
              <SurveyTemplateStepBlock
                key={step.id}
                step={step}
                disabled={isEditingRow || isSubmitting}
                canMoveUp={index > 0}
                canMoveDown={index < steps.length - 1}
                onEditStep={() => openEditForm(step)}
                onDeleteStep={() => setDeletingStep(step)}
                onDuplicateStep={() => void duplicateStep(step)}
                onMoveStepUp={() => moveStep(step, "up")}
                onMoveStepDown={() => moveStep(step, "down")}
              />
            ),
          )}
          {isEditingRow && !editingStep
            ? renderEditorRow(`new-step-${stageId}`)
            : null}
        </>
      )}

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
              Bước này sẽ bị xóa khỏi giai đoạn và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3">
            <p className="font-medium">
              Bước {deletingStep?.step_order}: {deletingStep?.step_name}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingStep(null)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
