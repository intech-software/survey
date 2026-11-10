"use client";

import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import { matchesSearchKeyword } from "@/lib/search-utils";
import { surveyTemplatesService } from "@/services/index.service";
import useSearchStore from "@/store/search.store";
import { CircleOff, Copy, Edit2, EllipsisVertical, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type { SurveyTemplate, UpdateSurveyTemplatePayload } from "../types";
import {
  getCreatorLabel,
  getErrorMessage,
  getSurveyTemplateStatusLabel,
  isSurveyTemplateActive,
} from "../utils";
import { TemplateTreeContext } from "./template-tree-context";
import SurveyTemplateDetail from "./survey-template-detail";

type TemplateFormState = {
  code: string;
  name: string;
  version: string;
  description: string;
};

const SEARCH_SCOPE = "/templates";

const emptyForm = (): TemplateFormState => ({
  code: "",
  name: "",
  version: "1",
  description: "",
});

const toFormState = (template: SurveyTemplate): TemplateFormState => ({
  code: template.code,
  name: template.name,
  version: String(template.version),
  description: template.description ?? "",
});

const ERROR_MESSAGES: Record<string, string> = {
  "A survey template with this code and version already exists":
    "Đã có template với mã và phiên bản này.",
};

const toVietnameseError = (error: unknown, fallback: string) => {
  const message = getErrorMessage(error, fallback);
  return ERROR_MESSAGES[message] ?? message;
};

export default function InlineSurveyTemplates() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SurveyTemplate | null>(
    null,
  );
  const [cloningTemplate, setCloningTemplate] = useState<SurveyTemplate | null>(
    null,
  );
  const [deletingTemplate, setDeletingTemplate] =
    useState<SurveyTemplate | null>(null);
  const [deactivatingTemplate, setDeactivatingTemplate] =
    useState<SurveyTemplate | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const [form, setForm] = useState<TemplateFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInFlight = useRef(false);
  const search = useSearchStore(
    (state) => state.searchByPath[SEARCH_SCOPE] ?? "",
  );

  const {
    data = [],
    error,
    isLoading,
    mutate,
  } = useSWR(API_ROUTES.surveyTemplates.base, surveyTemplatesService.fetchAll);

  const templates = useMemo(
    () =>
      [...data].sort(
        (first, second) =>
          first.code.localeCompare(second.code) ||
          second.version - first.version ||
          second.id - first.id,
      ),
    [data],
  );
  const visibleTemplates = useMemo(
    () =>
      templates.filter((template) =>
        matchesSearchKeyword(
          [template.code, template.name, template.description, template.version],
          search,
        ),
      ),
    [templates, search],
  );
  const nextVersionFor = (code: string) =>
    templates
      .filter((template) => template.code === code)
      .reduce((highest, template) => Math.max(highest, template.version), 0) + 1;

  const selectedListTemplate = useMemo(
    () =>
      selectedTemplateId === null
        ? null
        : (templates.find((template) => template.id === selectedTemplateId) ??
          null),
    [selectedTemplateId, templates],
  );
  const {
    data: fetchedDetailTemplate,
    error: detailError,
    isLoading: isDetailLoading,
    mutate: mutateDetail,
  } = useSWR(
    selectedTemplateId === null
      ? null
      : API_ROUTES.surveyTemplates.detail(selectedTemplateId),
    () => surveyTemplatesService.fetchById(selectedTemplateId!),
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );
  const detailTemplate = fetchedDetailTemplate ?? selectedListTemplate;

  const setFormOpen = (open: boolean) => {
    setIsFormOpen(open);

    if (!open) {
      setEditingTemplate(null);
      setCloningTemplate(null);
      setForm(emptyForm());
    }
  };

  const openCreateForm = () => {
    setEditingTemplate(null);
    setCloningTemplate(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEditForm = (template: SurveyTemplate) => {
    setEditingTemplate(template);
    setCloningTemplate(null);
    setForm(toFormState(template));
    setFormOpen(true);
  };

  const openCloneForm = (template: SurveyTemplate) => {
    setEditingTemplate(null);
    setCloningTemplate(template);
    setForm({
      ...toFormState(template),
      version: String(nextVersionFor(template.code)),
    });
    setFormOpen(true);
  };

  const validateForm = () => {
    const version = Number(form.version);

    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên template.");
      return false;
    }
    if (form.name.trim().length > 255) {
      toast.error("Tên template tối đa 255 ký tự.");
      return false;
    }
    if (!form.code.trim()) {
      toast.error("Vui lòng nhập mã template.");
      return false;
    }
    if (form.code.trim().length > 50) {
      toast.error("Mã template tối đa 50 ký tự.");
      return false;
    }
    if (!Number.isInteger(version) || version <= 0) {
      toast.error("Phiên bản phải là số nguyên dương.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionInFlight.current || !validateForm()) return;

    const nextValues = {
      code: form.code.trim(),
      name: form.name.trim(),
      version: Number(form.version),
      description: form.description.trim() || null,
    };

    submissionInFlight.current = true;
    setIsSubmitting(true);
    try {
      if (editingTemplate) {
        const payload: UpdateSurveyTemplatePayload = {};
        if (nextValues.code !== editingTemplate.code) {
          payload.code = nextValues.code;
        }
        if (nextValues.name !== editingTemplate.name) {
          payload.name = nextValues.name;
        }
        if (nextValues.version !== editingTemplate.version) {
          payload.version = nextValues.version;
        }
        if (nextValues.description !== (editingTemplate.description ?? null)) {
          payload.description = nextValues.description;
        }

        if (Object.keys(payload).length > 0) {
          const updated = await surveyTemplatesService.update(
            editingTemplate.id,
            payload,
          );
          await mutate(
            (current) =>
              current?.map((template) =>
                template.id === updated.id ? updated : template,
              ),
            { revalidate: false },
          );
          if (selectedTemplateId === updated.id) {
            await mutateDetail(
              (current) => (current ? { ...current, ...updated } : current),
              { revalidate: false },
            );
          }
          toast.success("Đã cập nhật template khảo sát.");
        }
      } else if (cloningTemplate) {
        const copiedTemplate = await surveyTemplatesService.copy({
          source_template_id: cloningTemplate.id,
          ...nextValues,
        });
        await mutate((current) => [copiedTemplate, ...(current ?? [])], {
          revalidate: false,
        });
        toast.success("Đã nhân bản template và toàn bộ nội dung khảo sát.");
      } else {
        const created = await surveyTemplatesService.create(nextValues);
        await mutate((current) => [created, ...(current ?? [])], {
          revalidate: false,
        });
        toast.success("Đã tạo template khảo sát.");
      }

      setFormOpen(false);
      setEditingTemplate(null);
    } catch (submitError) {
      toast.error(
        toVietnameseError(
          submitError,
          editingTemplate
            ? "Không thể cập nhật template khảo sát."
            : cloningTemplate
              ? "Không thể nhân bản template khảo sát."
              : "Không thể tạo template khảo sát.",
        ),
      );
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;

    setIsSubmitting(true);
    try {
      await surveyTemplatesService.delete(deletingTemplate.id);
      toast.success("Đã xóa template khảo sát.");
      if (selectedTemplateId === deletingTemplate.id) {
        setSelectedTemplateId(null);
      }
      setDeletingTemplate(null);
      await mutate();
    } catch (deleteError) {
      toast.error(
        toVietnameseError(deleteError, "Không thể xóa template khảo sát."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingTemplate) return;

    setIsSubmitting(true);
    try {
      const updated = await surveyTemplatesService.update(
        deactivatingTemplate.id,
        { status: "inactive" },
      );
      await mutate(
        (current) =>
          current?.map((template) =>
            template.id === updated.id ? updated : template,
          ),
        { revalidate: false },
      );
      if (selectedTemplateId === updated.id) {
        await mutateDetail(
          (current) => (current ? { ...current, ...updated } : current),
          { revalidate: false },
        );
      }
      setDeactivatingTemplate(null);
      toast.success("Đã ngừng sử dụng template khảo sát.");
    } catch (deactivateError) {
      toast.error(
        toVietnameseError(
          deactivateError,
          "Không thể ngừng sử dụng template khảo sát.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full w-full flex-col">
      {detailTemplate ? (
        <TemplateTreeContext.Provider
          key={detailTemplate.id}
          value={{
            template: fetchedDetailTemplate,
            mutate: mutateDetail,
            isLoading: isDetailLoading,
            error: detailError,
          }}
        >
          <SurveyTemplateDetail
            template={detailTemplate}
            isLoading={isDetailLoading}
            errorMessage={
              detailError
                ? getErrorMessage(
                    detailError,
                    "Không thể tải dữ liệu mới nhất của template.",
                  )
                : null
            }
            onClose={() => setSelectedTemplateId(null)}
            onEdit={() => openEditForm(detailTemplate)}
            onDelete={() => setDeletingTemplate(detailTemplate)}
            onDeactivate={() => setDeactivatingTemplate(detailTemplate)}
            isSubmitting={isSubmitting}
          />
        </TemplateTreeContext.Provider>
      ) : (
        <section className="w-full flex-1 rounded border bg-white p-4 shadow-md">
          <div className="mb-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
                Template phiếu khảo sát
              </h2>
              <p className="mt-2 break-words text-sm font-medium text-gray-600 md:text-base">
                Giai đoạn, bước và thông số dùng chung cho các phiếu khảo sát
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              <Button type="button" onClick={openCreateForm}>
                <Plus className="size-4" />
                Thêm
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {getErrorMessage(error, "Không thể tải danh sách template.")}
            </div>
          ) : isLoading ? (
            <div className="divide-y divide-gray-200 border-y border-gray-200">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex min-h-[100px] items-center gap-4 px-3 py-4"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
                    <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
                  </div>
                  <div className="w-36 shrink-0 space-y-2">
                    <div className="ml-auto h-4 w-20 animate-pulse rounded bg-gray-100" />
                    <div className="ml-auto h-4 w-28 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleTemplates.length > 0 ? (
            <div className="divide-y divide-gray-200 border-y border-gray-200">
              {visibleTemplates.map((template) => (
                <article
                  key={template.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedTemplateId(template.id)}
                  onKeyDown={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      setSelectedTemplateId(template.id);
                    }
                  }}
                  className="flex min-h-[100px] cursor-pointer items-center gap-4 px-3 py-4 outline-none transition-colors hover:bg-gray-50 focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {template.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm text-gray-600">
                        {template.code} · Phiên bản {template.version}
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          isSurveyTemplateActive(template)
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }
                      >
                        {getSurveyTemplateStatusLabel(template)}
                      </Badge>
                    </div>
                    {template.description ? (
                      <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                        {template.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="max-w-52 truncate text-xs font-semibold text-amber-600">
                      {getCreatorLabel(template)}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0"
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Thao tác template ${template.code} phiên bản ${template.version}`}
                      >
                        <EllipsisVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <DropdownMenuItem onSelect={() => openCloneForm(template)}>
                        <Copy className="size-4" />
                        Nhân bản
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => openEditForm(template)}>
                        <Edit2 className="size-4" />
                        Sửa
                      </DropdownMenuItem>
                      {isSurveyTemplateActive(template) ? (
                        <DropdownMenuItem
                          onSelect={() => setDeactivatingTemplate(template)}
                        >
                          <CircleOff className="size-4" />
                          Ngừng sử dụng
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setDeletingTemplate(template)}
                      >
                        <Trash2 className="size-4" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-gray-500">
              {templates.length > 0
                ? "Không có template nào khớp với từ khóa tìm kiếm."
                : "Chưa có template khảo sát nào. Bấm “Thêm” để tạo template đầu tiên."}
            </div>
          )}
        </section>
      )}

      <Dialog
        open={Boolean(deactivatingTemplate)}
        onOpenChange={(open) => {
          if (!isSubmitting && !open) setDeactivatingTemplate(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ngừng sử dụng template?</DialogTitle>
            <DialogDescription>
              Template này sẽ không còn được chọn để tạo phiếu khảo sát mới.
              Dữ liệu và các phiếu khảo sát đã tạo vẫn được giữ nguyên.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setDeactivatingTemplate(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmitting}
              onClick={() => void handleDeactivate()}
            >
              <CircleOff className="size-4" />
              {isSubmitting ? "Đang cập nhật..." : "Ngừng sử dụng"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!isSubmitting) setFormOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate
                ? "Cập nhật template khảo sát"
                : cloningTemplate
                  ? "Nhân bản template khảo sát"
                  : "Nhập template khảo sát"}
            </DialogTitle>
            <DialogDescription>
              {cloningTemplate
                ? `Chỉnh sửa thông tin bản sao. Toàn bộ giai đoạn, bước và thông số từ template ${cloningTemplate.code} phiên bản ${cloningTemplate.version} sẽ được sao chép.`
                : "Mã và phiên bản không được trùng với template đã có."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="survey-template-name">Tên template *</Label>
              <Input
                id="survey-template-name"
                value={form.name}
                maxLength={255}
                disabled={isSubmitting}
                placeholder="Phiếu khảo sát hệ thống HVAC phòng sạch"
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
              <div className="space-y-2">
                <Label htmlFor="survey-template-code">Mã template *</Label>
                <Input
                  id="survey-template-code"
                  value={form.code}
                  maxLength={50}
                  disabled={isSubmitting}
                  placeholder="KS-HVAC"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      code: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="survey-template-version">Phiên bản *</Label>
                <Input
                  id="survey-template-version"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={form.version}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      version: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="survey-template-description">Mô tả</Label>
              <Textarea
                id="survey-template-description"
                value={form.description}
                rows={4}
                disabled={isSubmitting}
                placeholder="Phạm vi áp dụng, đối tượng khảo sát…"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? cloningTemplate
                    ? "Đang nhân bản..."
                    : "Đang lưu..."
                  : cloningTemplate
                    ? "Nhân bản"
                    : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingTemplate)}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setDeletingTemplate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa template khảo sát</DialogTitle>
            <DialogDescription>
              Template {deletingTemplate?.code} phiên bản{" "}
              {deletingTemplate?.version} cùng toàn bộ giai đoạn, bước và thông
              số sẽ bị xóa. Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingTemplate(null)}
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
    </div>
  );
}
