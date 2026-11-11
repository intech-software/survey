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
import surveyRecordsService from "@/services/survey-records.service";
import surveyTemplatesService from "@/services/survey-templates.service";
import { Loader2 } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type { SurveyRecord } from "../types";
import { getSurveyRecordErrorMessage } from "../utils";

type CreateForm = {
  templateId: string;
  title: string;
  project: string;
  location: string;
  surveyDate: string;
  description: string;
};

const todayInputValue = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const emptyForm = (): CreateForm => ({
  templateId: "",
  title: "",
  project: "",
  location: "",
  surveyDate: todayInputValue(),
  description: "",
});

const selectClassName =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export default function CreateSurveyRecordDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (record: SurveyRecord) => void | Promise<void>;
}) {
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    data: templates,
    error: templatesError,
    isLoading: loadingTemplates,
  } = useSWR(
    open ? API_ROUTES.surveyTemplates.base : null,
    surveyTemplatesService.fetchAll,
  );
  const activeTemplates = useMemo(
    () =>
      (templates ?? [])
        .filter((template) => template.status !== "inactive")
        .sort(
          (first, second) =>
            first.code.localeCompare(second.code) ||
            second.version - first.version,
        ),
    [templates],
  );

  const updateForm = (field: keyof CreateForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const changeOpen = (nextOpen: boolean) => {
    if (isSubmitting) return;
    if (nextOpen) setForm(emptyForm());
    onOpenChange(nextOpen);
  };

  const createRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const templateId = Number(form.templateId);
    if (!Number.isInteger(templateId) || templateId <= 0) {
      toast.error("Vui lòng chọn một template.");
      return;
    }
    const title = form.title.trim();
    if (!title) {
      toast.error("Vui lòng nhập tiêu đề phiếu.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await surveyRecordsService.create({
        survey_template_id: templateId,
        title,
        project: form.project.trim() || null,
        location: form.location.trim() || null,
        survey_date: form.surveyDate || null,
        description: form.description.trim() || null,
      });
      toast.success("Đã tạo phiếu khảo sát từ template.");
      onOpenChange(false);
      setForm(emptyForm());
      await onCreated(created);
    } catch (createError) {
      toast.error(
        getSurveyRecordErrorMessage(createError, "Không thể tạo phiếu khảo sát."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={(event) => void createRecord(event)}>
          <DialogHeader>
            <DialogTitle>Tạo phiếu khảo sát</DialogTitle>
            <DialogDescription>
              Chọn template để sao chép toàn bộ giai đoạn, bước và thông số.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="survey-record-template">
                Template <span className="text-red-500">*</span>
              </Label>
              <select
                id="survey-record-template"
                value={form.templateId}
                disabled={isSubmitting || loadingTemplates}
                onChange={(event) => updateForm("templateId", event.target.value)}
                className={selectClassName}
              >
                <option value="">
                  {loadingTemplates ? "Đang tải template..." : "Chọn template"}
                </option>
                {activeTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.code} v{template.version} - {template.name}
                  </option>
                ))}
              </select>
              {templatesError ? (
                <p className="text-sm text-red-600">
                  {getSurveyRecordErrorMessage(
                    templatesError,
                    "Không thể tải danh sách template.",
                  )}
                </p>
              ) : null}
              {!loadingTemplates &&
              !templatesError &&
              templates &&
              activeTemplates.length === 0 ? (
                <p className="text-sm text-amber-700">
                  Chưa có template đang active. Hãy tạo template ở menu Template.
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="survey-record-title">
                Tiêu đề <span className="text-red-500">*</span>
              </Label>
              <Input
                id="survey-record-title"
                value={form.title}
                maxLength={255}
                disabled={isSubmitting}
                onChange={(event) => updateForm("title", event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="survey-record-project">Dự án</Label>
                <Input
                  id="survey-record-project"
                  value={form.project}
                  maxLength={255}
                  disabled={isSubmitting}
                  onChange={(event) => updateForm("project", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="survey-record-date">Ngày khảo sát</Label>
                <Input
                  id="survey-record-date"
                  type="date"
                  value={form.surveyDate}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    updateForm("surveyDate", event.target.value)
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="survey-record-location">Địa điểm</Label>
              <Input
                id="survey-record-location"
                value={form.location}
                maxLength={255}
                disabled={isSubmitting}
                onChange={(event) => updateForm("location", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="survey-record-description">Mô tả</Label>
              <Textarea
                id="survey-record-description"
                rows={3}
                value={form.description}
                disabled={isSubmitting}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => changeOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !form.templateId || !form.title.trim()}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
