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
import surveyRecordsService from "@/services/survey-records.service";
import surveyTemplatesService from "@/services/survey-templates.service";
import useSearchStore from "@/store/search.store";
import {
  EllipsisVertical,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type { SurveyRecord } from "../types";
import {
  RECORD_STATUS_LABELS,
  formatRecordDateTime,
  formatSurveyDate,
  getPersonLabel,
  getRecordStatus,
} from "../utils";
import SurveyRecordDetail from "./survey-record-detail";

const SEARCH_SCOPE = "/home";

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message ?? error?.response?.data?.error;
  return Array.isArray(message) ? message.join("; ") : message || fallback;
};

const ERROR_MESSAGES: Record<string, string> = {
  "Survey template is inactive": "Template đã ngừng sử dụng.",
  "Survey template not found": "Không tìm thấy template.",
  "An approved survey record cannot be deleted":
    "Không thể xoá phiếu đã được phê duyệt.",
};

const toVietnameseError = (error: unknown, fallback: string) => {
  const message = getErrorMessage(error, fallback);
  return ERROR_MESSAGES[message] ?? message;
};

const STATUS_CLASSNAMES = {
  draft: "border-amber-200 bg-amber-50 text-amber-800",
  checked: "border-blue-200 bg-blue-50 text-blue-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
} as const;

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

export default function InlineSurveyRecords() {
  const [selectedRecord, setSelectedRecord] = useState<SurveyRecord | null>(
    null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<SurveyRecord | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const search = useSearchStore(
    (state) => state.searchByPath[SEARCH_SCOPE] ?? "",
  );

  const {
    data: records,
    error,
    isLoading,
    mutate,
  } = useSWR(API_ROUTES.surveyRecords.base, surveyRecordsService.fetchAll);

  const {
    data: templates,
    error: templatesError,
    isLoading: loadingTemplates,
  } = useSWR(
    isCreateOpen ? API_ROUTES.surveyTemplates.base : null,
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

  const visibleRecords = useMemo(
    () =>
      (records ?? []).filter((record) =>
        matchesSearchKeyword(
          [
            record.title,
            record.project,
            record.location,
            record.template_code,
            record.template_name,
            record.description,
            getPersonLabel(record.createdBy),
          ],
          search,
        ),
      ),
    [records, search],
  );

  if (selectedRecord) {
    return (
      <div className="flex min-h-full w-full flex-col">
        <SurveyRecordDetail
          recordId={selectedRecord.id}
          initialRecord={selectedRecord}
          onClose={() => {
            setSelectedRecord(null);
            void mutate();
          }}
        />
      </div>
    );
  }

  const updateForm = (field: keyof CreateForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const openCreateDialog = () => {
    setForm(emptyForm());
    setIsCreateOpen(true);
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
      await mutate();
      setIsCreateOpen(false);
      toast.success("Đã tạo phiếu khảo sát từ template.");
      setSelectedRecord(created);
    } catch (createError) {
      toast.error(
        toVietnameseError(createError, "Không thể tạo phiếu khảo sát."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRecord = async () => {
    if (!deletingRecord) return;

    setIsDeleting(true);
    try {
      await surveyRecordsService.delete(deletingRecord.id);
      await mutate();
      setDeletingRecord(null);
      toast.success("Đã xóa phiếu khảo sát.");
    } catch (deleteError) {
      toast.error(
        toVietnameseError(deleteError, "Không thể xóa phiếu khảo sát."),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex min-h-full w-full flex-col">
      <section className="w-full flex-1 rounded border bg-white p-4 shadow-md">
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
              Phiếu khảo sát
            </h2>
            <p className="mt-2 break-words text-sm font-medium text-gray-600 md:text-base">
              Tạo phiếu từ template và ghi nhận kết quả khảo sát
            </p>
          </div>
          {!isLoading && !error ? (
            <Button
              type="button"
              className="shrink-0 self-end bg-slate-900 text-white hover:bg-slate-800 sm:self-auto"
              onClick={openCreateDialog}
            >
              <Plus className="size-4" />
              Thêm mới
            </Button>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {getErrorMessage(error, "Không thể tải danh sách phiếu khảo sát.")}
          </div>
        ) : visibleRecords.length > 0 ? (
          <div className="mt-4 divide-y border-y">
            {visibleRecords.map((record) => {
              const status = getRecordStatus(record);
              return (
                <div
                  key={record.id}
                  className="group flex items-stretch transition-colors hover:bg-slate-50"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedRecord(record)}
                    className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <FileText className="mt-0.5 size-5 shrink-0 text-slate-700" />
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-slate-900">
                          {record.title}
                        </p>
                        <p className="mt-1 break-words text-xs text-slate-500">
                          {record.template_code} v{record.template_version} ·{" "}
                          {record.template_name}
                        </p>
                        {record.project || record.location ? (
                          <p className="mt-1 break-words text-xs text-slate-500">
                            {[record.project, record.location]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-row flex-wrap items-center gap-2 pl-8 text-sm sm:flex-col sm:items-end sm:gap-1 sm:pl-0 sm:text-right">
                      <Badge
                        variant="outline"
                        className={STATUS_CLASSNAMES[status]}
                      >
                        {RECORD_STATUS_LABELS[status]}
                      </Badge>
                      <span className="text-slate-700">
                        {record.survey_date
                          ? formatSurveyDate(record.survey_date)
                          : formatRecordDateTime(record.created_at)}
                      </span>
                      <span className="text-orange-600">
                        {getPersonLabel(record.createdBy)}
                      </span>
                    </div>
                  </button>
                  {!record.approved_at ? (
                    <div className="flex shrink-0 items-center pr-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-slate-700"
                            aria-label="Thao tác phiếu khảo sát"
                            title="Thao tác phiếu khảo sát"
                          >
                            <EllipsisVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeletingRecord(record)}
                          >
                            <Trash2 className="size-4" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <div className="w-10 shrink-0" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 flex min-h-40 flex-col items-center justify-center rounded border border-dashed px-4 text-center">
            <FileText className="size-8 text-slate-300" />
            <p className="mt-3 font-medium text-slate-700">
              {search ? "Không có phiếu phù hợp" : "Chưa có phiếu khảo sát"}
            </p>
            {!search ? (
              <p className="mt-1 text-sm text-slate-500">
                Chọn Thêm mới để tạo phiếu từ một template đang active.
              </p>
            ) : null}
          </div>
        )}
      </section>

      <Dialog
        open={Boolean(deletingRecord)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingRecord(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa phiếu khảo sát</DialogTitle>
            <DialogDescription>
              Toàn bộ giai đoạn, bước, thông số, kết quả và hình ảnh của phiếu
              sẽ bị xóa. Thao tác này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-900">
              {deletingRecord?.title}
            </p>
            <p className="mt-1 text-slate-600">
              {deletingRecord
                ? `${deletingRecord.template_code} v${deletingRecord.template_version}`
                : ""}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeletingRecord(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void deleteRecord()}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {isDeleting ? "Đang xóa..." : "Xóa phiếu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!isSubmitting) setIsCreateOpen(open);
        }}
      >
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
                  onChange={(event) =>
                    updateForm("templateId", event.target.value)
                  }
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
                    {getErrorMessage(
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
                    Chưa có template đang active. Hãy tạo template ở menu
                    Template.
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
                    onChange={(event) =>
                      updateForm("project", event.target.value)
                    }
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
                  onChange={(event) =>
                    updateForm("location", event.target.value)
                  }
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
                onClick={() => setIsCreateOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting || !form.templateId || !form.title.trim()
                }
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
