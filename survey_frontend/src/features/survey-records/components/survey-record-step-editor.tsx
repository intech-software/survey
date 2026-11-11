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
import { Textarea } from "@/components/ui/textarea";
import {
  SURVEY_PARAMETER_DATA_TYPES,
  type SurveyParameterDataType,
  type UpdateSurveyTemplateParameterPayload,
} from "@/features/survey-templates/types";
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
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  SurveyRecordParameter,
  SurveyRecordStep,
} from "../types";
import {
  formatRecordDateTime,
  getPersonLabel,
  getStepParameters,
} from "../utils";
import SurveyRecordResultInput from "./survey-record-result-input";
import SurveyRecordNoteInput from "./survey-record-note-input";
import SurveyRecordParameterImageCell from "./survey-record-parameter-image-cell";

type ParameterFormState = {
  parameterName: string;
  dataType: SurveyParameterDataType;
  unit: string;
  requirement: string;
  parameterOrder: string;
};

type ParameterRow =
  | { kind: "parameter"; parameter: SurveyRecordParameter }
  | { kind: "editor"; key: string }
  | { kind: "empty" };

const DATA_TYPE_LABELS: Record<SurveyParameterDataType, string> = {
  text: "văn bản",
  number: "số",
  decimal: "số thập phân",
  boolean: "đúng/sai",
  yes_no: "có/không có",
  date: "ngày",
  datetime: "ngày giờ",
  select: "lựa chọn",
};

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join("; ") : message ?? fallback;
};

const getRecordedBy = (parameter: SurveyRecordParameter) =>
  getPersonLabel(parameter.recordedBy);

export default function SurveyRecordStepEditor({
  step,
  disabled,
  parameterEntryDisabled,
  canMoveUp,
  canMoveDown,
  onEditStep,
  onDeleteStep,
  onMoveStepUp,
  onMoveStepDown,
  onChanged,
}: {
  step: SurveyRecordStep;
  disabled: boolean;
  parameterEntryDisabled: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEditStep: () => void;
  onDeleteStep: () => void;
  onMoveStepUp: () => void;
  onMoveStepDown: () => void;
  onChanged: () => Promise<unknown>;
}) {
  const parameters = useMemo(() => getStepParameters(step), [step]);
  const [isEditingRow, setIsEditingRow] = useState(false);
  const [editingParameter, setEditingParameter] =
    useState<SurveyRecordParameter | null>(null);
  const [deletingParameter, setDeletingParameter] =
    useState<SurveyRecordParameter | null>(null);
  const [form, setForm] = useState<ParameterFormState>({
    parameterName: "",
    dataType: "text",
    unit: "",
    requirement: "",
    parameterOrder: "1",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeEditor = () => {
    setIsEditingRow(false);
    setEditingParameter(null);
  };

  const openCreateForm = () => {
    const nextOrder =
      parameters.reduce(
        (highestOrder, parameter) =>
          Math.max(highestOrder, parameter.parameter_order),
        0,
      ) + 1;
    setEditingParameter(null);
    setForm({
      parameterName: "",
      dataType: "text",
      unit: "",
      requirement: "",
      parameterOrder: String(nextOrder),
    });
    setIsEditingRow(true);
  };

  const openEditForm = (parameter: SurveyRecordParameter) => {
    setEditingParameter(parameter);
    setForm({
      parameterName: parameter.parameter_name,
      dataType: parameter.data_type,
      unit: parameter.unit ?? "",
      requirement: parameter.requirement ?? "",
      parameterOrder: String(parameter.parameter_order),
    });
    setIsEditingRow(true);
  };

  const validateForm = () => {
    const parameterName = form.parameterName.trim();
    const parameterOrder = Number(form.parameterOrder);
    const unit = form.unit.trim();
    if (!parameterName) {
      toast.error("Vui lòng nhập tên thông số.");
      return false;
    }
    if (parameterName.length > 255) {
      toast.error("Tên thông số tối đa 255 ký tự.");
      return false;
    }
    if (unit.length > 50) {
      toast.error("Đơn vị tính tối đa 50 ký tự.");
      return false;
    }
    if (!SURVEY_PARAMETER_DATA_TYPES.includes(form.dataType)) {
      toast.error("Kiểu dữ liệu không hợp lệ.");
      return false;
    }
    if (!Number.isInteger(parameterOrder) || parameterOrder <= 0) {
      toast.error("Thứ tự thông số phải là số nguyên dương.");
      return false;
    }
    if (
      parameters.some(
        (parameter) =>
          parameter.id !== editingParameter?.id &&
          parameter.parameter_order === parameterOrder,
      )
    ) {
      toast.error("Thứ tự này đã được sử dụng trong bước.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    const nextValues = {
      parameter_name: form.parameterName.trim(),
      data_type: form.dataType,
      unit: form.unit.trim() || null,
      requirement: form.requirement.trim() || null,
      parameter_order: Number(form.parameterOrder),
    };

    setIsSubmitting(true);
    try {
      if (editingParameter) {
        const payload: UpdateSurveyTemplateParameterPayload = {};
        if (nextValues.parameter_name !== editingParameter.parameter_name) {
          payload.parameter_name = nextValues.parameter_name;
        }
        if (nextValues.data_type !== editingParameter.data_type) {
          payload.data_type = nextValues.data_type;
        }
        if (nextValues.unit !== (editingParameter.unit ?? null)) {
          payload.unit = nextValues.unit;
        }
        if (nextValues.requirement !== (editingParameter.requirement ?? null)) {
          payload.requirement = nextValues.requirement;
        }
        if (nextValues.parameter_order !== editingParameter.parameter_order) {
          payload.parameter_order = nextValues.parameter_order;
        }
        if (Object.keys(payload).length > 0) {
          await surveyRecordsService.updateParameter(
            editingParameter.id,
            payload,
          );
          toast.success("Đã cập nhật thông số trong phiếu khảo sát.");
        }
      } else {
        await surveyRecordsService.createParameter(
          step.id,
          nextValues,
        );
        toast.success("Đã thêm thông số vào phiếu khảo sát.");
      }
      closeEditor();
      await onChanged();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          editingParameter
            ? "Không thể cập nhật thông số."
            : "Không thể thêm thông số.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingParameter) return;
    let wasDeleted = false;
    setIsSubmitting(true);
    try {
      await surveyRecordsService.deleteParameter(
        deletingParameter.id,
      );
      wasDeleted = true;
      setDeletingParameter(null);
      await compactUniqueOrdersAfterDelete({
        deletedItemId: deletingParameter.id,
        orderedItems: parameters.map((parameter) => ({
          id: parameter.id,
          order: parameter.parameter_order,
        })),
        updateOrder: (id, order) =>
          surveyRecordsService.updateParameter(id, {
            parameter_order: order,
          }),
      });
      toast.success("Đã xóa thông số khỏi phiếu khảo sát.");
      await onChanged();
    } catch (error) {
      if (wasDeleted) {
        await onChanged().catch(() => undefined);
        toast.error("Đã xóa thông số, nhưng không thể cập nhật lại thứ tự.");
        return;
      }
      toast.error(getErrorMessage(error, "Không thể xóa thông số."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveParameter = async (
    parameter: SurveyRecordParameter,
    direction: "up" | "down",
  ) => {
    const currentIndex = parameters.findIndex((item) => item.id === parameter.id);
    const adjacentIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const adjacentParameter = parameters[adjacentIndex];
    if (!adjacentParameter) return;
    const temporaryOrder =
      parameters.reduce(
        (highestOrder, item) => Math.max(highestOrder, item.parameter_order),
        0,
      ) + 1;

    setIsSubmitting(true);
    try {
      await swapUniqueOrders({
        itemId: parameter.id,
        itemOrder: parameter.parameter_order,
        adjacentId: adjacentParameter.id,
        adjacentOrder: adjacentParameter.parameter_order,
        temporaryOrder,
        updateOrder: (id, order) =>
          surveyRecordsService.updateParameter(id, {
            parameter_order: order,
          }),
      });
      toast.success(
        direction === "up"
          ? "Đã di chuyển thông số lên trên."
          : "Đã di chuyển thông số xuống dưới.",
      );
      await onChanged();
    } catch (error) {
      await onChanged();
      toast.error(getErrorMessage(error, "Không thể thay đổi thứ tự thông số."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const rows: ParameterRow[] = parameters.map((parameter) =>
    isEditingRow && editingParameter?.id === parameter.id
      ? { kind: "editor", key: `edit-${parameter.id}` }
      : { kind: "parameter", parameter },
  );
  if (isEditingRow && !editingParameter) {
    rows.push({ kind: "editor", key: `new-${step.id}` });
  }
  if (rows.length === 0) rows.push({ kind: "empty" });

  return (
    <>
      {rows.map((row, rowIndex) => (
        <tr
          key={
            row.kind === "parameter"
              ? row.parameter.id
              : row.kind === "editor"
                ? row.key
                : row.kind
          }
        >
          {rowIndex === 0 ? (
            <td rowSpan={rows.length} className="border border-black px-2 py-2 align-top">
              <div className="flex items-start justify-between gap-1">
                <span className="min-w-0 flex-1 break-words">
                  Bước {step.step_order}: {step.step_name}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 shrink-0"
                      disabled={disabled || isEditingRow || isSubmitting}
                      aria-label={`Thao tác bước ${step.step_order}`}
                    >
                      <EllipsisVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="font-sans">
                    <DropdownMenuItem onSelect={openCreateForm}>
                      <Plus className="size-4" />
                      Thêm thông số
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!canMoveUp} onSelect={onMoveStepUp}>
                      <ArrowUp className="size-4" />
                      Di chuyển lên trên
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!canMoveDown} onSelect={onMoveStepDown}>
                      <ArrowDown className="size-4" />
                      Di chuyển xuống dưới
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onEditStep}>
                      <Edit2 className="size-4" />
                      Sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={onDeleteStep}>
                      <Trash2 className="size-4" />
                      Xóa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </td>
          ) : null}

          {row.kind === "parameter" ? (
            <>
              <td className="border border-black px-2 py-2 align-top">
                <div className="flex items-start justify-between gap-1">
                  <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                    <span className="font-semibold">
                      {row.parameter.parameter_name}
                      {row.parameter.requirement ? ":" : ""}
                    </span>
                    {row.parameter.requirement ? ` ${row.parameter.requirement}` : null}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 shrink-0 opacity-25 hover:opacity-100"
                        disabled={isEditingRow || isSubmitting}
                        aria-label={`Thao tác thông số ${row.parameter.parameter_order}`}
                      >
                        <EllipsisVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="font-sans">
                      <DropdownMenuItem
                        disabled={parameters[0]?.id === row.parameter.id}
                        onSelect={() => moveParameter(row.parameter, "up")}
                      >
                        <ArrowUp className="size-4" />
                        Di chuyển lên trên
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={parameters[parameters.length - 1]?.id === row.parameter.id}
                        onSelect={() => moveParameter(row.parameter, "down")}
                      >
                        <ArrowDown className="size-4" />
                        Di chuyển xuống dưới
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => openEditForm(row.parameter)}>
                        <Edit2 className="size-4" />
                        Sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setDeletingParameter(row.parameter)}
                      >
                        <Trash2 className="size-4" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </td>
              <td className="border border-black p-0 align-middle">
                <SurveyRecordResultInput
                  key={row.parameter.id}
                  parameter={row.parameter}
                  disabled={parameterEntryDisabled}
                  onSaved={onChanged}
                />
              </td>
              <td className="border border-black p-0 align-middle">
                <SurveyRecordNoteInput
                  key={row.parameter.id}
                  parameter={row.parameter}
                  disabled={parameterEntryDisabled}
                  onSaved={onChanged}
                />
              </td>
              <td className="border border-black p-0 align-middle">
                <SurveyRecordParameterImageCell
                  parameter={row.parameter}
                  readOnly={parameterEntryDisabled}
                  onChanged={onChanged}
                />
              </td>
              <td className="break-words border border-black px-2 py-2 text-center align-middle text-sm leading-5">
                {getRecordedBy(row.parameter)}
                {row.parameter.recorded_at ? (
                  <span className="mt-1 block text-xs text-gray-600">
                    {formatRecordDateTime(row.parameter.recorded_at)}
                  </span>
                ) : null}
              </td>
            </>
          ) : row.kind === "editor" ? (
            <td colSpan={5} className="border border-black bg-emerald-50/40 px-2 py-1">
              <form
                className="grid grid-cols-[64px_minmax(120px,0.9fr)_120px_minmax(90px,0.65fr)_minmax(160px,1.35fr)] items-start gap-2"
                onSubmit={handleSubmit}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && !isSubmitting) {
                    event.preventDefault();
                    closeEditor();
                  }
                }}
              >
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.parameterOrder}
                  disabled={isSubmitting}
                  className="h-8 rounded-sm border-black bg-white px-2 text-center font-serif text-[15px]"
                  aria-label="Thứ tự thông số"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, parameterOrder: event.target.value }))
                  }
                />
                <Textarea
                  value={form.parameterName}
                  maxLength={255}
                  rows={1}
                  disabled={isSubmitting}
                  placeholder="Tên thông số"
                  autoFocus
                  className="min-h-8 resize-none rounded-sm border-black bg-white px-2 py-1 font-serif text-[15px]"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, parameterName: event.target.value }))
                  }
                />
                <select
                  value={form.dataType}
                  disabled={isSubmitting}
                  className="h-8 rounded-sm border border-black bg-white px-2 font-serif text-[15px]"
                  aria-label="Kiểu dữ liệu"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dataType: event.target.value as SurveyParameterDataType,
                    }))
                  }
                >
                  {SURVEY_PARAMETER_DATA_TYPES.map((dataType) => (
                    <option key={dataType} value={dataType}>
                      {DATA_TYPE_LABELS[dataType]}
                    </option>
                  ))}
                </select>
                <Input
                  value={form.unit}
                  maxLength={50}
                  disabled={isSubmitting}
                  placeholder="Đơn vị"
                  className="h-8 rounded-sm border-black bg-white px-2 font-serif text-[15px]"
                  aria-label="Đơn vị tính"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, unit: event.target.value }))
                  }
                />
                <Textarea
                  value={form.requirement}
                  rows={1}
                  disabled={isSubmitting}
                  placeholder="Yêu cầu (không bắt buộc)"
                  className="min-h-8 resize-none rounded-sm border-black bg-white px-2 py-1 font-serif text-[15px]"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, requirement: event.target.value }))
                  }
                />
                <div className="col-span-full flex justify-end gap-1 font-sans">
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
                </div>
              </form>
            </td>
          ) : (
            <>
              <td className="h-10 border border-black" />
              <td className="border border-black" />
              <td className="border border-black" />
              <td className="border border-black" />
              <td className="border border-black" />
            </>
          )}
        </tr>
      ))}

      <Dialog
        open={Boolean(deletingParameter)}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setDeletingParameter(null);
        }}
      >
        <DialogContent className="font-sans">
          <DialogHeader>
            <DialogTitle>Xóa thông số</DialogTitle>
            <DialogDescription>
              Thông số này sẽ bị xóa khỏi phiếu khảo sát và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3">
            <p className="font-medium">{deletingParameter?.parameter_name}</p>
            <p className="mt-1 text-sm text-gray-600">{deletingParameter?.requirement}</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setDeletingParameter(null)}
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
