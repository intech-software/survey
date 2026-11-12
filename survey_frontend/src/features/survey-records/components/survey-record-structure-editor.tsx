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
import type { UpdateSurveyTemplateStagePayload } from "@/features/survey-templates/types";
import {
  compactUniqueOrdersAfterDelete,
  swapUniqueOrders,
} from "../swap-unique-orders";
import surveyRecordsService from "@/services/survey-records.service";
import {
  ArrowDown,
  ArrowUp,
  Edit2,
  EllipsisVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { Fragment, type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  SurveyRecord,
  SurveyRecordStage,
} from "../types";
import { getRecordStages } from "../utils";
import SurveyRecordStageEditor from "./survey-record-stage-editor";

type StageFormState = {
  stageName: string;
  stageOrder: string;
};

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join("; ") : message ?? fallback;
};

export default function SurveyRecordStructureEditor({
  record,
  parameterEntryDisabled,
  onChanged,
}: {
  record: SurveyRecord;
  parameterEntryDisabled: boolean;
  onChanged: () => Promise<unknown>;
}) {
  const stages = useMemo(() => getRecordStages(record), [record]);
  const [isEditingRow, setIsEditingRow] = useState(false);
  const [editingStage, setEditingStage] =
    useState<SurveyRecordStage | null>(null);
  const [deletingStage, setDeletingStage] =
    useState<SurveyRecordStage | null>(null);
  const [insertAtOrder, setInsertAtOrder] = useState<number | null>(null);
  const [form, setForm] = useState<StageFormState>({
    stageName: "",
    stageOrder: "1",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepCreateRequest, setStepCreateRequest] = useState({
    stageId: 0,
    requestId: 0,
  });

  const closeEditor = () => {
    setIsEditingRow(false);
    setEditingStage(null);
    setInsertAtOrder(null);
  };

  const openCreateForm = (order?: number) => {
    const nextOrder =
      order ??
      stages.reduce(
        (highestOrder, stage) => Math.max(highestOrder, stage.stage_order),
        0,
      ) +
        1;
    setEditingStage(null);
    setInsertAtOrder(nextOrder);
    setForm({ stageName: "", stageOrder: String(nextOrder) });
    setIsEditingRow(true);
  };

  const openEditForm = (stage: SurveyRecordStage) => {
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
    return true;
  };

  const shiftStagesForInsert = async (stageOrder: number) => {
    const affectedStages = stages
      .filter((stage) => stage.stage_order >= stageOrder)
      .sort((left, right) => right.stage_order - left.stage_order);
    const shifted: SurveyRecordStage[] = [];
    for (const stage of affectedStages) {
      await surveyRecordsService.updateStage(stage.id, {
        stage_order: stage.stage_order + 1,
      });
      shifted.push(stage);
    }
    return shifted;
  };

  const rollbackShiftedStages = async (
    shiftedStages: SurveyRecordStage[],
  ) => {
    for (const stage of [...shiftedStages].sort(
      (left, right) => left.stage_order - right.stage_order,
    )) {
      try {
        await surveyRecordsService.updateStage(stage.id, {
          stage_order: stage.stage_order,
        });
      } catch (rollbackError) {
        void rollbackError;
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;
    const nextValues = {
      stage_name: form.stageName.trim(),
      stage_order: Number(form.stageOrder),
    };
    setIsSubmitting(true);
    try {
      if (editingStage) {
        const payload: UpdateSurveyTemplateStagePayload = {};
        if (nextValues.stage_name !== editingStage.stage_name) {
          payload.stage_name = nextValues.stage_name;
        }
        if (Object.keys(payload).length > 0) {
          await surveyRecordsService.updateStage(
            editingStage.id,
            payload,
          );
          toast.success("Đã cập nhật giai đoạn trong phiếu khảo sát.");
        }
      } else {
        const shifted = await shiftStagesForInsert(nextValues.stage_order);
        try {
          await surveyRecordsService.createStage(record.id, nextValues);
        } catch (error) {
          await rollbackShiftedStages(shifted);
          throw error;
        }
        toast.success("Đã thêm giai đoạn vào phiếu khảo sát.");
      }
      closeEditor();
      await onChanged();
    } catch (error) {
      await onChanged();
      toast.error(
        getErrorMessage(
          error,
          editingStage
            ? "Không thể cập nhật giai đoạn."
            : "Không thể thêm giai đoạn.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStage) return;
    let wasDeleted = false;
    setIsSubmitting(true);
    try {
      await surveyRecordsService.deleteStage(deletingStage.id);
      wasDeleted = true;
      setDeletingStage(null);
      await compactUniqueOrdersAfterDelete({
        deletedItemId: deletingStage.id,
        orderedItems: stages.map((stage) => ({
          id: stage.id,
          order: stage.stage_order,
        })),
        updateOrder: (id, order) =>
          surveyRecordsService.updateStage(id, {
            stage_order: order,
          }),
      });
      toast.success("Đã xóa giai đoạn khỏi phiếu khảo sát.");
      await onChanged();
    } catch (error) {
      if (wasDeleted) {
        await onChanged().catch(() => undefined);
        toast.error("Đã xóa giai đoạn, nhưng không thể cập nhật lại thứ tự.");
        return;
      }
      toast.error(getErrorMessage(error, "Không thể xóa giai đoạn."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveStage = async (
    stage: SurveyRecordStage,
    direction: "up" | "down",
  ) => {
    const currentIndex = stages.findIndex((item) => item.id === stage.id);
    const adjacentIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const adjacentStage = stages[adjacentIndex];
    if (!adjacentStage) return;
    const temporaryOrder =
      stages.reduce(
        (highestOrder, item) => Math.max(highestOrder, item.stage_order),
        0,
      ) + 1;
    setIsSubmitting(true);
    try {
      await swapUniqueOrders({
        itemId: stage.id,
        itemOrder: stage.stage_order,
        adjacentId: adjacentStage.id,
        adjacentOrder: adjacentStage.stage_order,
        temporaryOrder,
        updateOrder: (id, order) =>
          surveyRecordsService.updateStage(id, {
            stage_order: order,
          }),
      });
      toast.success(
        direction === "up"
          ? "Đã di chuyển giai đoạn lên trên."
          : "Đã di chuyển giai đoạn xuống dưới.",
      );
      await onChanged();
    } catch (error) {
      await onChanged();
      toast.error(getErrorMessage(error, "Không thể thay đổi thứ tự giai đoạn."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEditorRow = (key: string | number) => (
    <tr key={key}>
      <td colSpan={6} className="h-11 border border-black bg-blue-50/40 px-2 py-1">
        <form
          className="flex items-center gap-2"
          onSubmit={handleSubmit}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !isSubmitting) {
              event.preventDefault();
              closeEditor();
            }
          }}
        >
          <span className="shrink-0 font-medium">Giai đoạn</span>
          <Input
            type="number"
            min="1"
            step="1"
            value={form.stageOrder}
            readOnly
            disabled={isSubmitting}
            className="h-8 w-16 shrink-0 rounded-sm border-black bg-gray-100 px-2 text-center font-serif text-[15px]"
            aria-label="Thứ tự giai đoạn"
          />
          <span className="shrink-0 font-medium">:</span>
          <Input
            value={form.stageName}
            maxLength={255}
            disabled={isSubmitting}
            placeholder="Nhập tên giai đoạn"
            autoFocus
            className="h-8 min-w-0 flex-1 rounded-sm border-black bg-white px-2 font-serif text-[15px]"
            onChange={(event) =>
              setForm((current) => ({ ...current, stageName: event.target.value }))
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
      <div className="relative mt-6 pb-3">
        <table className="w-full table-fixed border-collapse border border-black">
          <colgroup>
            <col className="w-[17%]" />
            <col className="w-[23%]" />
            <col className="w-[27%]" />
            <col className="w-[14%]" />
            <col className="w-[8%]" />
            <col className="w-[11%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="h-20 border border-black px-2 py-2 text-center font-bold">
                Nội dung kiểm tra
              </th>
              <th className="h-20 border border-black px-2 py-2 text-center font-bold">
                Yêu cầu
              </th>
              <th className="h-20 border border-black px-2 py-2 text-center font-bold">
                Thực tế
              </th>
              <th className="h-20 border border-black px-2 py-2 text-center font-bold">
                Ghi chú
              </th>
              <th className="h-20 border border-black px-2 py-2 text-center font-bold">
                Hình ảnh
              </th>
              <th className="h-20 border border-black px-2 py-2 text-center font-bold">
                Người thực hiện
              </th>
            </tr>
          </thead>
          <tbody>
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
                    <td colSpan={6} className="relative border border-black px-2 py-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 break-words font-semibold">
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
                          <DropdownMenuContent align="end" className="font-sans">
                            <DropdownMenuItem onSelect={() => requestStepCreation(stage.id)}>
                              <Plus className="size-4" />
                              Thêm bước
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={index === 0}
                              onSelect={() => void moveStage(stage, "up")}
                            >
                              <ArrowUp className="size-4" />
                              Di chuyển lên trên
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={index === stages.length - 1}
                              onSelect={() => void moveStage(stage, "down")}
                            >
                              <ArrowDown className="size-4" />
                              Di chuyển xuống dưới
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openEditForm(stage)}>
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
                <SurveyRecordStageEditor
                  stage={stage}
                  parameterEntryDisabled={parameterEntryDisabled}
                  createStepRequestId={
                    stepCreateRequest.stageId === stage.id
                      ? stepCreateRequest.requestId
                      : 0
                  }
                  disabled={isEditingRow || isSubmitting}
                  onChanged={onChanged}
                />
                {index < stages.length - 1 ? (
                  <tr className="h-0">
                    <td colSpan={6} className="relative h-0 border-0 p-0">
                      <button
                        type="button"
                        className="absolute -left-3 -top-3 z-20 flex size-6 items-center justify-center rounded-full border border-blue-500 bg-white text-blue-600 opacity-20 shadow-sm hover:bg-blue-50 hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-10"
                        disabled={isEditingRow || isSubmitting}
                        onClick={() => openCreateForm(stages[index + 1].stage_order)}
                        title="Thêm giai đoạn tại đây"
                        aria-label="Thêm giai đoạn tại đây"
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
                <td colSpan={6} className="border border-black px-2 py-6 text-center text-gray-500">
                  Phiếu chưa có giai đoạn.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <button
          type="button"
          className="absolute -bottom-0 -left-3 z-10 flex size-6 items-center justify-center rounded-full border border-blue-500 bg-white text-blue-600 opacity-20 shadow-sm hover:bg-blue-50 hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-10"
          disabled={isEditingRow || isSubmitting}
          onClick={() => openCreateForm()}
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
              Giai đoạn, các bước và thông số con sẽ bị xóa khỏi phiếu khảo sát.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3">
            Giai đoạn {deletingStage?.stage_order}: {deletingStage?.stage_name}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setDeletingStage(null)}
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
