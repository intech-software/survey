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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  surveyTemplateStagesService,
} from "@/services/index.service";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Edit2,
  EllipsisVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { Fragment, type FormEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useTemplateTree } from "./template-tree-context";
import { applyStageMutation } from "../tree-cache";
import type {
  SurveyTemplateStageMutation,
  SurveyTemplateStage,
  UpdateSurveyTemplateStagePayload,
} from "../types";
import SurveyTemplateSteps from "./survey-template-steps";

type StageFormState = {
  stageName: string;
  stageOrder: string;
};

const EMPTY_DATA: SurveyTemplateStage[] = [];

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join("; ") : message ?? fallback;
};

export default function SurveyTemplateStages({
  templateId,
}: {
  templateId: number;
}) {
  const [isEditingRow, setIsEditingRow] = useState(false);
  const [editingStage, setEditingStage] =
    useState<SurveyTemplateStage | null>(null);
  const [insertAtOrder, setInsertAtOrder] = useState<number | null>(null);
  const [stepCreateRequest, setStepCreateRequest] = useState<{
    stageId: number | null;
    requestId: number;
  }>({ stageId: null, requestId: 0 });
  const [deletingStage, setDeletingStage] =
    useState<SurveyTemplateStage | null>(null);
  const [form, setForm] = useState<StageFormState>({
    stageName: "",
    stageOrder: "1",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInFlight = useRef(false);
  const { template, mutate, error, isLoading } = useTemplateTree();
  const data = template?.stages ?? EMPTY_DATA;

  const stages = useMemo(
    () => [...data].sort((first, second) => first.stage_order - second.stage_order),
    [data],
  );

  const closeForm = () => {
    setIsEditingRow(false);
    setEditingStage(null);
    setInsertAtOrder(null);
  };

  const openCreateForm = (requestedOrder?: number) => {
    const nextOrder =
      requestedOrder ??
      stages.reduce(
        (highestOrder, stage) => Math.max(highestOrder, stage.stage_order),
        0,
      ) + 1;
    setEditingStage(null);
    setInsertAtOrder(nextOrder);
    setForm({ stageName: "", stageOrder: String(nextOrder) });
    setIsEditingRow(true);
  };

  const openEditForm = (stage: SurveyTemplateStage) => {
    setEditingStage(stage);
    setInsertAtOrder(null);
    setForm({
      stageName: stage.stage_name,
      stageOrder: String(stage.stage_order),
    });
    setIsEditingRow(true);
  };

  const requestStepCreation = (stageId: number) => {
    setStepCreateRequest((current) => ({
      stageId,
      requestId: current.requestId + 1,
    }));
  };

  const validateForm = () => {
    const stageName = form.stageName.trim();
    const stageOrder = Number(form.stageOrder);

    if (!stageName) {
      toast.error("Vui lòng nhập tên giai đoạn.");
      return false;
    }
    if (stageName.length > 255) {
      toast.error("Tên giai đoạn tối đa 255 ký tự.");
      return false;
    }
    if (!Number.isInteger(stageOrder) || stageOrder <= 0) {
      toast.error("Thứ tự giai đoạn phải là số nguyên dương.");
      return false;
    }
    if (
      editingStage &&
      stages.some(
        (stage) =>
          stage.id !== editingStage?.id && stage.stage_order === stageOrder,
      )
    ) {
      toast.error("Thứ tự này đã được sử dụng trong biểu mẫu.");
      return false;
    }
    return true;
  };

  const applyMutation = async (result: SurveyTemplateStageMutation) => {
    await mutate(
      (current) => current ? applyStageMutation(current, result) : current,
      { revalidate: false },
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionInFlight.current || !validateForm()) return;

    const nextValues = {
      stage_name: form.stageName.trim(),
      stage_order: Number(form.stageOrder),
    };

    submissionInFlight.current = true;
    setIsSubmitting(true);
    try {
      if (editingStage) {
        const payload: UpdateSurveyTemplateStagePayload = {};
        if (nextValues.stage_name !== editingStage.stage_name) {
          payload.stage_name = nextValues.stage_name;
        }
        if (nextValues.stage_order !== editingStage.stage_order) {
          payload.stage_order = nextValues.stage_order;
        }
        if (Object.keys(payload).length > 0) {
          const result = await surveyTemplateStagesService.update(editingStage.id, payload);
          await applyMutation(result);
          toast.success("Đã cập nhật giai đoạn.");
        }
      } else {
        const result = await surveyTemplateStagesService.create(templateId, {
          ...nextValues,
          insert: true,
        });
        await applyMutation(result);
        toast.success("Đã thêm giai đoạn.");
      }

      closeForm();
    } catch (submitError) {
      toast.error(
        getErrorMessage(
          submitError,
          editingStage
            ? "Không thể cập nhật giai đoạn."
            : "Không thể thêm giai đoạn.",
        ),
      );
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (submissionInFlight.current || !deletingStage) return;
    submissionInFlight.current = true;
    setIsSubmitting(true);
    try {
      const result = await surveyTemplateStagesService.delete(deletingStage.id);
      await applyMutation(result);
      setDeletingStage(null);
      toast.success("Đã xóa giai đoạn.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa giai đoạn."));
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const moveStage = async (stage: SurveyTemplateStage, direction: "up" | "down") => {
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    setIsSubmitting(true);
    try {
      const result = await surveyTemplateStagesService.move(stage.id, direction);
      await applyMutation(result);
      toast.success(direction === "up" ? "Đã di chuyển lên trên." : "Đã di chuyển xuống dưới.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể thay đổi thứ tự giai đoạn."));
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const duplicateStage = async (stage: SurveyTemplateStage) => {
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    setIsSubmitting(true);
    try {
      const result = await surveyTemplateStagesService.duplicate(stage.id);
      await applyMutation(result);
      toast.success("Đã nhân bản giai đoạn xuống ngay phía dưới.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể nhân bản giai đoạn."));
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const renderEditorRow = (key: string | number) => (
    <tr key={key}>
      <td
        colSpan={4}
        className="h-11 border border-black bg-blue-50/40 px-2 py-1 align-middle"
      >
        <form
          className="flex items-center gap-2"
          onSubmit={handleSubmit}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !isSubmitting) {
              event.preventDefault();
              closeForm();
            }
          }}
        >
          <span className="shrink-0 font-medium">Giai đoạn</span>
          <Input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={form.stageOrder}
            disabled={isSubmitting}
            readOnly={!editingStage}
            className="h-8 w-16 shrink-0 rounded-sm border-black bg-white px-2 text-center font-serif text-[15px] read-only:bg-gray-100"
            aria-label="Thứ tự giai đoạn"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                stageOrder: event.target.value,
              }))
            }
          />
          <span className="shrink-0 font-medium">:</span>
          <Input
            value={form.stageName}
            maxLength={255}
            disabled={isSubmitting}
            placeholder="Nhập tên giai đoạn"
            autoFocus
            className="h-8 min-w-0 flex-1 rounded-sm border-black bg-white px-2 font-serif text-[15px]"
            aria-label="Tên giai đoạn"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                stageName: event.target.value,
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
            onClick={closeForm}
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
      <div className="relative mt-6 pb-3">
        <table
          className="w-full table-fixed border-collapse border border-black"
          aria-label="Các giai đoạn của phiếu khảo sát"
        >
          <colgroup>
            <col className="w-[25%]" />
            <col className="w-[35%]" />
            <col className="w-[20%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="h-20 border border-black px-2 py-2 text-center align-middle font-bold leading-6">
                Nội dung khảo sát
              </th>
              <th className="h-20 border border-black px-2 py-2 text-center align-middle font-bold leading-6">
                Yêu cầu
              </th>
              <th className="h-20 border border-black px-2 py-2 text-center align-middle font-bold leading-6">
                Thực tế
              </th>
              <th className="h-20 border border-black px-2 py-2 text-center align-middle font-bold leading-6">
                Người
                <br />
                thực hiện
              </th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td
                  colSpan={4}
                  className="h-10 border border-black px-2 py-1 text-center text-sm text-red-700"
                >
                  {getErrorMessage(error, "Không thể tải danh sách giai đoạn.")}
                </td>
              </tr>
            ) : isLoading ? (
              <tr>
                <td
                  colSpan={4}
                  className="h-10 animate-pulse border border-black bg-gray-50 px-2 py-1 text-center text-sm text-gray-500"
                >
                  Đang tải các giai đoạn...
                </td>
              </tr>
            ) : (
              <>
                {stages.map((stage, index) => (
                  <Fragment key={stage.id}>
                    {isEditingRow &&
                    !editingStage &&
                    insertAtOrder === stage.stage_order
                      ? renderEditorRow(`new-stage-${insertAtOrder}`)
                      : null}
                    {isEditingRow && editingStage?.id === stage.id ? (
                      renderEditorRow(stage.id)
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="relative h-8 border border-black px-2 py-0.5 align-middle"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 flex-1 break-words font-medium">
                              Giai đoạn {stage.stage_order}: {stage.stage_name}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="h-7 w-7 shrink-0"
                                  disabled={isEditingRow || isSubmitting}
                                  aria-label={`Thao tác giai đoạn ${stage.stage_order}`}
                                >
                                  <EllipsisVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="font-sans"
                              >
                                <DropdownMenuItem
                                  onSelect={() => requestStepCreation(stage.id)}
                                >
                                  <Plus className="size-4" />
                                  Thêm bước
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => void duplicateStage(stage)}
                                >
                                  <Copy className="size-4" />
                                  Nhân bản
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={index === 0}
                                  onSelect={() => moveStage(stage, "up")}
                                >
                                  <ArrowUp className="size-4" />
                                  Di chuyển lên trên
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={index === stages.length - 1}
                                  onSelect={() => moveStage(stage, "down")}
                                >
                                  <ArrowDown className="size-4" />
                                  Di chuyển xuống dưới
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => openEditForm(stage)}
                                >
                                  <Edit2 className="size-4" />
                                  Sửa
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => setDeletingStage(stage)}
                                >
                                  <Trash2 className="size-4" />
                                  Xóa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )}
                    <SurveyTemplateSteps
                      stageId={stage.id}
                      createRequestId={
                        stepCreateRequest.stageId === stage.id
                          ? stepCreateRequest.requestId
                          : 0
                      }
                    />
                    {index < stages.length - 1 ? (
                      <tr className="h-0">
                        <td
                          colSpan={4}
                          className="relative h-0 border-0 p-0"
                        >
                          <button
                            type="button"
                            className="absolute -top-3 -left-3 z-20 flex size-6 items-center justify-center rounded-full border border-blue-500 bg-white text-blue-600 opacity-20 shadow-sm transition-[background-color,color,opacity,box-shadow] hover:bg-blue-50 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-10"
                            onClick={() =>
                              openCreateForm(stages[index + 1].stage_order)
                            }
                            disabled={isEditingRow || isSubmitting}
                            title={`Thêm giai đoạn trước giai đoạn ${stages[index + 1].stage_order}`}
                            aria-label={`Thêm giai đoạn trước giai đoạn ${stages[index + 1].stage_order}`}
                          >
                            <Plus className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
                {isEditingRow &&
                !editingStage &&
                !stages.some((stage) => stage.stage_order === insertAtOrder)
                  ? renderEditorRow(`new-stage-${insertAtOrder}`)
                  : null}
                {stages.length === 0 && !isEditingRow ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="h-10 border border-black px-2 py-1 text-center text-sm italic text-gray-500"
                    >
                      Chưa có giai đoạn
                    </td>
                  </tr>
                ) : null}
              </>
            )}
          </tbody>
        </table>

        <button
          type="button"
          className="absolute bottom-0 -left-3 z-10 flex size-6 items-center justify-center rounded-full border border-blue-500 bg-white text-blue-600 opacity-20 shadow-sm transition-[background-color,color,opacity,box-shadow] hover:bg-blue-50 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-10"
          onClick={() => openCreateForm()}
          disabled={!template || isLoading || isSubmitting || isEditingRow}
          title="Thêm giai đoạn"
          aria-label="Thêm giai đoạn"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <Dialog
        open={Boolean(deletingStage)}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setDeletingStage(null);
        }}
      >
        <DialogContent className="font-sans">
          <DialogHeader>
            <DialogTitle>Xóa giai đoạn</DialogTitle>
            <DialogDescription>
              Giai đoạn này sẽ bị xóa khỏi biểu mẫu và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3">
            <p className="font-medium">
              Giai đoạn {deletingStage?.stage_order}: {deletingStage?.stage_name}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingStage(null)}
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
