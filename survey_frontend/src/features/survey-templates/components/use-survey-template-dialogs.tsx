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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import { surveyTemplatesService } from "@/services/index.service";
import { CircleOff } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import type { SurveyTemplate, UpdateSurveyTemplatePayload } from "../types";
import { getErrorMessage } from "../utils";

type TemplateFormState = {
  code: string;
  name: string;
  version: string;
  description: string;
};

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

/**
 * Create / edit / clone / deactivate / delete dialogs for survey templates.
 * Shared by the list panel and the detail panel; both keep the list cache
 * (and the open detail cache) in sync through SWR.
 */
export function useSurveyTemplateDialogs({
  onCreated,
  onDeleted,
}: {
  onCreated?: (template: SurveyTemplate) => void | Promise<void>;
  onDeleted?: (template: SurveyTemplate) => void | Promise<void>;
} = {}) {
  const { mutate } = useSWRConfig();
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
  const [form, setForm] = useState<TemplateFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInFlight = useRef(false);

  const listKey = API_ROUTES.surveyTemplates.base;

  const applyUpdated = async (updated: SurveyTemplate) => {
    await mutate(
      listKey,
      (current?: SurveyTemplate[]) =>
        current?.map((template) =>
          template.id === updated.id ? { ...template, ...updated } : template,
        ),
      { revalidate: false },
    );
    await mutate(
      API_ROUTES.surveyTemplates.detail(updated.id),
      (current?: SurveyTemplate) =>
        current ? { ...current, ...updated } : current,
      { revalidate: false },
    );
  };

  const nextVersionFor = async (code: string) => {
    const templates = await surveyTemplatesService
      .fetchAll()
      .catch(() => [] as SurveyTemplate[]);
    return (
      templates
        .filter((template) => template.code === code)
        .reduce((highest, template) => Math.max(highest, template.version), 0) +
      1
    );
  };

  const setFormOpen = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingTemplate(null);
      setCloningTemplate(null);
      setForm(emptyForm());
    }
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setCloningTemplate(null);
    setForm(emptyForm());
    setIsFormOpen(true);
  };

  const openEdit = (template: SurveyTemplate) => {
    setEditingTemplate(template);
    setCloningTemplate(null);
    setForm(toFormState(template));
    setIsFormOpen(true);
  };

  const openClone = async (template: SurveyTemplate) => {
    setEditingTemplate(null);
    setCloningTemplate(template);
    setForm({
      ...toFormState(template),
      version: String(template.version + 1),
    });
    setIsFormOpen(true);
    const version = await nextVersionFor(template.code);
    setForm((current) =>
      current.code === template.code
        ? { ...current, version: String(version) }
        : current,
    );
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
      let created: SurveyTemplate | null = null;
      if (editingTemplate) {
        const payload: UpdateSurveyTemplatePayload = {};
        if (nextValues.code !== editingTemplate.code) payload.code = nextValues.code;
        if (nextValues.name !== editingTemplate.name) payload.name = nextValues.name;
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
          await applyUpdated(updated);
          toast.success("Đã cập nhật template khảo sát.");
        }
      } else if (cloningTemplate) {
        created = await surveyTemplatesService.copy({
          source_template_id: cloningTemplate.id,
          ...nextValues,
        });
        toast.success("Đã nhân bản template và toàn bộ nội dung khảo sát.");
      } else {
        created = await surveyTemplatesService.create(nextValues);
        toast.success("Đã tạo template khảo sát.");
      }

      if (created) {
        const newTemplate = created;
        await mutate(
          listKey,
          (current?: SurveyTemplate[]) => [newTemplate, ...(current ?? [])],
          { revalidate: false },
        );
      }
      setFormOpen(false);
      if (created) await onCreated?.(created);
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
    const template = deletingTemplate;
    setIsSubmitting(true);
    try {
      await surveyTemplatesService.delete(template.id);
      toast.success("Đã xóa template khảo sát.");
      setDeletingTemplate(null);
      await mutate(listKey);
      await onDeleted?.(template);
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
      await applyUpdated(updated);
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

  const dialogs = (
    <>
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
          <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
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
                    setForm((current) => ({ ...current, code: event.target.value }))
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
              onClick={() => void handleDelete()}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  return {
    dialogs,
    isSubmitting,
    openCreate,
    openEdit,
    openClone: (template: SurveyTemplate) => void openClone(template),
    openDelete: setDeletingTemplate,
    openDeactivate: setDeactivatingTemplate,
  };
}
