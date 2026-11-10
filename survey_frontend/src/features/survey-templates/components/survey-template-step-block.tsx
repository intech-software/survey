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
import { surveyTemplateParametersService } from "@/services/index.service";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Edit2,
  EllipsisVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { type FormEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useTemplateTree } from "./template-tree-context";
import { applyParameterMutation } from "../tree-cache";
import {
  SURVEY_PARAMETER_DATA_TYPES,
  type SurveyParameterDataType,
  type SurveyTemplateStep,
  type SurveyTemplateParameter,
  type SurveyTemplateParameterMutation,
  type UpdateSurveyTemplateParameterPayload,
} from "../types";

type ParameterFormState = {
  parameterName: string;
  dataType: SurveyParameterDataType;
  unit: string;
  requirement: string;
  parameterOrder: string;
};

type ParameterRow =
  | { kind: "parameter"; parameter: SurveyTemplateParameter }
  | { kind: "editor"; key: string }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty" };

const DATA_TYPE_LABELS: Record<SurveyParameterDataType, string> = {
  text: "văn bản",
  number: "số",
  decimal: "số thập phân",
  boolean: "đúng/sai",
  date: "ngày",
  datetime: "ngày giờ",
  select: "lựa chọn",
};

const EMPTY_DATA: SurveyTemplateParameter[] = [];

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join("; ") : message ?? fallback;
};

export default function SurveyTemplateStepBlock({
  step,
  disabled,
  canMoveUp,
  canMoveDown,
  onEditStep,
  onDeleteStep,
  onDuplicateStep,
  onMoveStepUp,
  onMoveStepDown,
}: {
  step: SurveyTemplateStep;
  disabled: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEditStep: () => void;
  onDeleteStep: () => void;
  onDuplicateStep: () => void;
  onMoveStepUp: () => void;
  onMoveStepDown: () => void;
}) {
  const [isEditingRow, setIsEditingRow] = useState(false);
  const [editingParameter, setEditingParameter] =
    useState<SurveyTemplateParameter | null>(null);
  const [deletingParameter, setDeletingParameter] =
    useState<SurveyTemplateParameter | null>(null);
  const [form, setForm] = useState<ParameterFormState>({
    parameterName: "",
    dataType: "text",
    unit: "",
    requirement: "",
    parameterOrder: "1",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInFlight = useRef(false);

  const { template, mutate, error, isLoading } = useTemplateTree();
  const data = template?.stages
    .flatMap((stage) => stage.steps)
    .find((current) => current.id === step.id)?.parameters ?? EMPTY_DATA;

  const parameters = useMemo(
    () =>
      [...data].sort(
        (first, second) => first.parameter_order - second.parameter_order,
      ),
    [data],
  );

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

  const openEditForm = (
    parameter: SurveyTemplateParameter,
  ) => {
    setEditingParameter(parameter);
    setForm({
      parameterName: parameter.parameter_name,
      dataType: parameter.data_type,
      unit: parameter.unit ?? "",
      requirement: parameter.requirement,
      parameterOrder: String(parameter.parameter_order),
    });
    setIsEditingRow(true);
  };

  const validateForm = () => {
    const parameterName = form.parameterName.trim();
    const unit = form.unit.trim();
    const requirement = form.requirement.trim();
    const parameterOrder = Number(form.parameterOrder);

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
    if (!requirement) {
      toast.error("Vui lòng nhập yêu cầu của thông số.");
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

  const applyMutation = async (result: SurveyTemplateParameterMutation) => {
    await mutate(
      (current) => current ? applyParameterMutation(current, step.id, result) : current,
      { revalidate: false },
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionInFlight.current || !validateForm()) return;

    const nextValues = {
      parameter_name: form.parameterName.trim(),
      data_type: form.dataType,
      unit: form.unit.trim() || null,
      requirement: form.requirement.trim(),
      parameter_order: Number(form.parameterOrder),
    };

    submissionInFlight.current = true;
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
        if (nextValues.requirement !== editingParameter.requirement) {
          payload.requirement = nextValues.requirement;
        }
        if (nextValues.parameter_order !== editingParameter.parameter_order) {
          payload.parameter_order = nextValues.parameter_order;
        }
        if (Object.keys(payload).length > 0) {
          const result = await surveyTemplateParametersService.update(
            editingParameter.id,
            payload,
          );
          await applyMutation(result);
          toast.success("Đã cập nhật thông số.");
        }
      } else {
        const result = await surveyTemplateParametersService.create(
          step.id,
          nextValues,
        );
        await applyMutation(result);
        toast.success("Đã thêm thông số.");
      }

      closeEditor();
    } catch (submitError) {
      toast.error(
        getErrorMessage(
          submitError,
          editingParameter
            ? "Không thể cập nhật thông số."
            : "Không thể thêm thông số.",
        ),
      );
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (submissionInFlight.current || !deletingParameter) return;
    submissionInFlight.current = true;
    setIsSubmitting(true);
    try {
      const result = await surveyTemplateParametersService.delete(deletingParameter.id);
      await applyMutation(result);
      setDeletingParameter(null);
      toast.success("Đã xóa thông số.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa thông số."));
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const moveParameter = async (parameter: SurveyTemplateParameter, direction: "up" | "down") => {
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    setIsSubmitting(true);
    try {
      const result = await surveyTemplateParametersService.move(parameter.id, direction);
      await applyMutation(result);
      toast.success(direction === "up" ? "Đã di chuyển lên trên." : "Đã di chuyển xuống dưới.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể thay đổi thứ tự thông số."));
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const duplicateParameter = async (parameter: SurveyTemplateParameter) => {
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    setIsSubmitting(true);
    try {
      const result = await surveyTemplateParametersService.duplicate(parameter.id);
      await applyMutation(result);
      toast.success("Đã nhân bản thông số xuống ngay phía dưới.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể nhân bản thông số."));
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const rows: ParameterRow[] = useMemo(() => {
    if (error) {
      return [
        {
          kind: "error",
          message: getErrorMessage(error, "Không thể tải danh sách thông số."),
        },
      ];
    }
    if (isLoading) return [{ kind: "loading" }];

    const parameterRows: ParameterRow[] = parameters.map((parameter) =>
      isEditingRow && editingParameter?.id === parameter.id
        ? { kind: "editor", key: `edit-${parameter.id}` }
        : { kind: "parameter", parameter },
    );
    if (isEditingRow && !editingParameter) {
      parameterRows.push({ kind: "editor", key: `new-${step.id}` });
    }
    return parameterRows.length > 0 ? parameterRows : [{ kind: "empty" }];
  }, [editingParameter, error, isEditingRow, isLoading, parameters, step.id]);

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
            <td
              rowSpan={rows.length}
              className="border border-black px-2 py-1 align-top"
            >
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
                    <DropdownMenuItem onSelect={onDuplicateStep}>
                      <Copy className="size-4" />
                      Nhân bản
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canMoveUp}
                      onSelect={onMoveStepUp}
                    >
                      <ArrowUp className="size-4" />
                      Di chuyển lên trên
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canMoveDown}
                      onSelect={onMoveStepDown}
                    >
                      <ArrowDown className="size-4" />
                      Di chuyển xuống dưới
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onEditStep}>
                      <Edit2 className="size-4" />
                      Sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={onDeleteStep}
                    >
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
              <td className="border border-black px-2 py-1 align-top">
                <div className="flex items-start justify-between gap-1">
                  <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                    {row.parameter.parameter_name}: {row.parameter.requirement}
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
                        onSelect={() => void duplicateParameter(row.parameter)}
                      >
                        <Copy className="size-4" />
                        Nhân bản
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={parameters[0]?.id === row.parameter.id}
                        onSelect={() => moveParameter(row.parameter, "up")}
                      >
                        <ArrowUp className="size-4" />
                        Di chuyển lên trên
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={
                          parameters[parameters.length - 1]?.id ===
                          row.parameter.id
                        }
                        onSelect={() => moveParameter(row.parameter, "down")}
                      >
                        <ArrowDown className="size-4" />
                        Di chuyển xuống dưới
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => openEditForm(row.parameter)}
                      >
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
              <td className="border border-black px-2 py-1 align-top">
                <div>
                  Kiểu dữ liệu dạng {DATA_TYPE_LABELS[row.parameter.data_type]}
                </div>
                {row.parameter.unit ? (
                  <div className="mt-1 break-words text-sm">
                    Đơn vị: <span className="font-semibold">{row.parameter.unit}</span>
                  </div>
                ) : null}
              </td>
              <td className="border border-black" />
            </>
          ) : row.kind === "editor" ? (
            <td
              colSpan={3}
              className="border border-black bg-emerald-50/40 px-2 py-1"
            >
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
                  inputMode="numeric"
                  value={form.parameterOrder}
                  readOnly={!editingParameter}
                  disabled={isSubmitting}
                  className="h-8 rounded-sm border-black bg-white px-2 text-center font-serif text-[15px] read-only:bg-gray-100"
                  aria-label="Thứ tự thông số"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      parameterOrder: event.target.value,
                    }))
                  }
                />
                <Textarea
                  value={form.parameterName}
                  maxLength={255}
                  rows={1}
                  disabled={isSubmitting}
                  placeholder="Tên thông số"
                  autoFocus
                  className="min-h-8 resize-none overflow-hidden rounded-sm border-black bg-white px-2 py-1 font-serif text-[15px] leading-5"
                  aria-label="Tên thông số"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      parameterName: event.target.value,
                    }))
                  }
                />
                <select
                  value={form.dataType}
                  disabled={isSubmitting}
                  className="h-8 rounded-sm border border-black bg-white px-2 font-serif text-[15px] outline-none focus:ring-2 focus:ring-blue-500"
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
                  placeholder="Đơn vị"
                  autoComplete="off"
                  disabled={isSubmitting}
                  className="h-8 rounded-sm border border-black bg-white px-2 font-serif text-[15px] outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Đơn vị tính"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      unit: event.target.value,
                    }))
                  }
                />
                <Textarea
                  value={form.requirement}
                  rows={1}
                  disabled={isSubmitting}
                  placeholder="Yêu cầu"
                  className="min-h-8 resize-none overflow-hidden rounded-sm border-black bg-white px-2 py-1 font-serif text-[15px] leading-5"
                  aria-label="Yêu cầu thông số"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      requirement: event.target.value,
                    }))
                  }
                />
                <div className="col-span-full flex items-center justify-end gap-1 font-sans">
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Đang lưu..." : "Lưu"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={closeEditor}
                    disabled={isSubmitting}
                  >
                    Hủy
                  </Button>
                </div>
              </form>
            </td>
          ) : row.kind === "loading" ? (
            <td
              colSpan={3}
              className="h-9 animate-pulse border border-black bg-gray-50 px-2 py-1 text-center text-sm text-gray-500"
            >
              Đang tải thông số...
            </td>
          ) : row.kind === "error" ? (
            <td
              colSpan={3}
              className="h-9 border border-black px-2 py-1 text-center text-sm text-red-700"
            >
              {row.message}
            </td>
          ) : (
            <>
              <td className="h-9 border border-black" />
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
              Thông số này sẽ bị xóa khỏi bước và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-gray-50 p-3">
            <p className="font-medium">{deletingParameter?.parameter_name}</p>
            <p className="mt-1 text-sm text-gray-600">
              {deletingParameter?.requirement}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingParameter(null)}
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
