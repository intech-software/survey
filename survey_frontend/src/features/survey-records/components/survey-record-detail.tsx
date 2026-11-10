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
import { ArrowLeft, Check, Edit2, Loader2 } from "lucide-react";
import Image from "next/image";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type { SurveyRecord, SurveyRecordParameter } from "../types";
import {
  formatRecordDateTime,
  formatSurveyDate,
  getPersonLabel,
  getRecordStages,
  getStageSteps,
  getStepParameters,
  toDateInputValue,
} from "../utils";
import { useSurveyRecordSocket } from "../use-survey-record-socket";
import SurveyRecordApprovals from "./survey-record-approvals";
import SurveyRecordNoteInput from "./survey-record-note-input";
import SurveyRecordParameterImageCell from "./survey-record-parameter-image-cell";
import SurveyRecordResultInput from "./survey-record-result-input";
import SurveyRecordStructureEditor from "./survey-record-structure-editor";

const getErrorMessage = (
  error: any,
  fallback = "Không thể tải phiếu khảo sát.",
) => {
  const message = error?.response?.data?.message ?? error?.response?.data?.error;
  return Array.isArray(message) ? message.join("; ") : message || fallback;
};

type HeaderDraft = {
  title: string;
  project: string;
  location: string;
  survey_date: string;
  description: string;
};

const cellLabel =
  "h-12 border border-black px-2 py-2 text-left align-middle font-semibold";
const cellValue = "h-12 break-words border border-black px-2 py-2 align-middle";

export default function SurveyRecordDetail({
  recordId,
  initialRecord,
  onClose,
}: {
  recordId: string | number;
  initialRecord?: SurveyRecord | null;
  onClose: () => void;
}) {
  const [isEditingStructure, setIsEditingStructure] = useState(false);
  const [headerDraft, setHeaderDraft] = useState<HeaderDraft | null>(null);
  const [isSavingHeader, setIsSavingHeader] = useState(false);
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    API_ROUTES.surveyRecords.detail(recordId),
    () => surveyRecordsService.fetchById(recordId),
    {
      fallbackData: initialRecord ?? undefined,
      refreshInterval: 0,
      revalidateOnFocus: true,
      keepPreviousData: false,
    },
  );

  const { connected, requestRefresh } = useSurveyRecordSocket(
    recordId,
    mutate,
    () => {
      toast.info("Phiếu khảo sát đã bị xóa hoặc không còn tồn tại.");
      onClose();
    },
  );

  const handleParameterSaved = async (updated: SurveyRecordParameter) => {
    await mutate(
      (current) =>
        current
          ? {
              ...current,
              stages: current.stages?.map((stage) => ({
                ...stage,
                steps: stage.steps?.map((step) => ({
                  ...step,
                  parameters: step.parameters?.map((parameter) =>
                    parameter.id === updated.id ? updated : parameter,
                  ),
                })),
              })),
            }
          : current,
      { revalidate: false },
    );
    // Also resync if this cache write superseded an in-flight remote refresh.
    await requestRefresh();
  };

  const record = data ?? initialRecord ?? null;

  if (!record && isLoading) {
    return (
      <section className="flex min-h-56 w-full flex-1 items-center justify-center rounded border bg-white shadow-md">
        <Loader2 className="size-7 animate-spin text-blue-500" />
      </section>
    );
  }

  if (!record) {
    return (
      <section className="w-full flex-1 rounded border bg-white p-4 shadow-md">
        <Button type="button" variant="ghost" onClick={onClose}>
          <ArrowLeft className="size-5" />
          Quay lại
        </Button>
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getErrorMessage(error)}
        </div>
      </section>
    );
  }

  const stages = getRecordStages(record);
  const isChecked = Boolean(record.checked_at);
  const isApproved = Boolean(record.approved_at);
  const isParameterEntryDisabled = !isChecked || isApproved;
  const isStructureEditorOpen = isEditingStructure && !isChecked;

  const openHeaderEditor = () =>
    setHeaderDraft({
      title: record.title ?? "",
      project: record.project ?? "",
      location: record.location ?? "",
      survey_date: toDateInputValue(record.survey_date),
      description: record.description ?? "",
    });

  const saveHeader = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!headerDraft) return;
    const title = headerDraft.title.trim();
    if (!title) {
      toast.error("Vui lòng nhập tiêu đề phiếu.");
      return;
    }
    setIsSavingHeader(true);
    try {
      await surveyRecordsService.update(record.id, {
        title,
        project: headerDraft.project.trim() || null,
        location: headerDraft.location.trim() || null,
        survey_date: headerDraft.survey_date || null,
        description: headerDraft.description.trim() || null,
      });
      await requestRefresh();
      setHeaderDraft(null);
      toast.success("Đã cập nhật thông tin phiếu khảo sát.");
    } catch (updateError) {
      toast.error(
        getErrorMessage(updateError, "Không thể cập nhật thông tin phiếu."),
      );
    } finally {
      setIsSavingHeader(false);
    }
  };

  const updateDraft = (field: keyof HeaderDraft, value: string) =>
    setHeaderDraft((current) => (current ? { ...current, [field]: value } : current));

  return (
    <section className="w-full flex-1 overflow-hidden rounded border bg-white shadow-md">
      {!connected ? (
        <div className="flex items-center justify-between gap-2 border-b bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <span>Chưa kết nối cập nhật trực tiếp.</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void requestRefresh()}
          >
            Làm mới
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-start gap-2 border-b p-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mt-0.5 shrink-0"
          onClick={onClose}
          title="Quay lại danh sách phiếu khảo sát"
          aria-label="Quay lại danh sách phiếu khảo sát"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
              Chi tiết phiếu khảo sát
            </h2>
            {isValidating ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-blue-400" />
            ) : null}
          </div>
          <p className="mt-2 break-words text-sm font-medium text-gray-600 md:text-base">
            {record.title}
            {record.project ? ` - ${record.project}` : ""}
          </p>
        </div>
        {!isChecked ? (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="font-sans"
              onClick={openHeaderEditor}
            >
              <Edit2 className="size-4" />
              Thông tin
            </Button>
            <Button
              type="button"
              variant={isEditingStructure ? "default" : "outline"}
              className="font-sans"
              onClick={() => setIsEditingStructure((current) => !current)}
            >
              {isEditingStructure ? (
                <Check className="size-4" />
              ) : (
                <Edit2 className="size-4" />
              )}
              {isEditingStructure ? "Hoàn tất" : "Chỉnh sửa"}
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mx-4 mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Dữ liệu gần nhất vẫn đang được hiển thị. {getErrorMessage(error)}
        </div>
      ) : null}

      <div className="overflow-x-auto bg-gray-50 p-2 sm:p-3">
        <div
          className="min-w-[760px] bg-white text-[15px] leading-6 text-black antialiased [text-rendering:optimizeLegibility]"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          <table className="w-full table-fixed border-collapse border border-black">
            <colgroup>
              <col className="w-[168px]" />
              <col />
              <col className="w-[180px]" />
            </colgroup>
            <tbody>
              <tr>
                <td
                  rowSpan={3}
                  className="h-40 border border-black p-4 align-middle"
                >
                  <div className="flex h-full items-center justify-center">
                    <Image
                      src="/logo.png"
                      alt="Tecova"
                      width={130}
                      height={64}
                      className="h-auto max-h-16 w-auto object-contain"
                      priority
                    />
                  </div>
                </td>
                <td
                  rowSpan={3}
                  className="h-40 border border-black px-6 py-3 text-center align-middle leading-8"
                >
                  <div className="text-xl font-bold uppercase">
                    Phiếu khảo sát
                  </div>
                  <div className="text-lg font-semibold">
                    {record.template_name}
                  </div>
                </td>
                <td className="h-[52px] break-words border border-black px-2 py-1.5 align-middle leading-5">
                  Mã hiệu: {record.template_code}
                </td>
              </tr>
              <tr>
                <td className="h-[52px] border border-black px-2 py-1.5 align-middle leading-5">
                  Lần ban hành: {String(record.template_version).padStart(2, "0")}
                </td>
              </tr>
              <tr>
                <td className="h-[52px] border border-black px-2 py-1.5 align-middle leading-5">
                  Số phiếu: {record.id}
                </td>
              </tr>
            </tbody>
          </table>

          <table className="mt-6 w-full table-fixed border-collapse border border-black">
            <colgroup>
              <col className="w-[168px]" />
              <col />
              <col className="w-[140px]" />
              <col className="w-[180px]" />
            </colgroup>
            <tbody>
              <tr>
                <th className={cellLabel}>Tiêu đề:</th>
                <td colSpan={3} className={`${cellValue} font-bold`}>
                  {record.title}
                </td>
              </tr>
              <tr>
                <th className={cellLabel}>Dự án:</th>
                <td className={`${cellValue} font-bold`}>{record.project}</td>
                <th className={cellLabel}>Ngày khảo sát:</th>
                <td className={`${cellValue} font-bold`}>
                  {formatSurveyDate(record.survey_date)}
                </td>
              </tr>
              <tr>
                <th className={cellLabel}>Địa điểm:</th>
                <td colSpan={3} className={`${cellValue} font-bold`}>
                  {record.location}
                </td>
              </tr>
              <tr>
                <th className={cellLabel}>Mô tả:</th>
                <td
                  colSpan={3}
                  className={`${cellValue} whitespace-pre-wrap`}
                >
                  {record.description}
                </td>
              </tr>
              <tr>
                <th className={cellLabel}>Người tạo:</th>
                <td className={cellValue}>{getPersonLabel(record.createdBy)}</td>
                <th className={cellLabel}>Ngày tạo:</th>
                <td className={cellValue}>
                  {formatRecordDateTime(record.created_at)}
                </td>
              </tr>
            </tbody>
          </table>

          {isParameterEntryDisabled && !isApproved ? (
            <div
              role="status"
              className="mt-6 border border-amber-300 bg-amber-50 px-3 py-2 font-sans text-sm font-medium text-amber-900"
            >
              Chưa thể nhập kết quả. Người kiểm tra cần ký phiếu trước khi nhập
              kết quả thực tế, ghi chú hoặc hình ảnh.
            </div>
          ) : null}
          {isApproved ? (
            <div
              role="status"
              className="mt-6 border border-emerald-300 bg-emerald-50 px-3 py-2 font-sans text-sm font-medium text-emerald-900"
            >
              Phiếu đã được phê duyệt. Kết quả đã bị khoá.
            </div>
          ) : null}

          {isStructureEditorOpen ? (
            <SurveyRecordStructureEditor
              record={record}
              parameterEntryDisabled={isParameterEntryDisabled}
              onChanged={requestRefresh}
            />
          ) : (
            <table className="mt-6 w-full table-fixed border-collapse border border-black">
              <colgroup>
                <col className="w-[17%]" />
                <col className="w-[33%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[8%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr>
                  {[
                    "Nội dung kiểm tra",
                    "Yêu cầu",
                    "Thực tế",
                    "Ghi chú",
                    "Hình ảnh",
                    "Người thực hiện",
                  ].map((label) => (
                    <th
                      key={label}
                      className="border border-black px-2 py-3 text-center align-middle font-bold leading-5"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stages.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="border border-black px-3 py-8 text-center text-gray-500"
                    >
                      Phiếu chưa có giai đoạn.
                    </td>
                  </tr>
                ) : (
                  stages.map((stage) => {
                    const steps = getStageSteps(stage);
                    return [
                      <tr key={`stage-${stage.id}`}>
                        <td
                          colSpan={6}
                          className="border border-black px-2 py-2 font-semibold"
                        >
                          Giai đoạn {stage.stage_order}: {stage.stage_name}
                        </td>
                      </tr>,
                      ...steps.flatMap((step) => {
                        const parameters = getStepParameters(step);
                        if (parameters.length === 0) {
                          return [
                            <tr key={`step-${step.id}`}>
                              <td className="border border-black px-2 py-2 align-top">
                                Bước {step.step_order}: {step.step_name}
                              </td>
                              <td className="border border-black px-2 py-2" />
                              <td className="border border-black px-2 py-2" />
                              <td className="border border-black px-2 py-2" />
                              <td className="border border-black px-2 py-2" />
                              <td className="border border-black px-2 py-2" />
                            </tr>,
                          ];
                        }

                        return parameters.map((parameter, parameterIndex) => (
                          <tr key={`parameter-${parameter.id}`}>
                            {parameterIndex === 0 ? (
                              <td
                                rowSpan={parameters.length}
                                className="border border-black px-2 py-2 align-top"
                              >
                                Bước {step.step_order}: {step.step_name}
                              </td>
                            ) : null}
                            <td className="whitespace-pre-wrap break-words border border-black px-2 py-2 align-top">
                              <span className="font-semibold">
                                {parameter.parameter_name}:
                              </span>{" "}
                              {parameter.requirement}
                            </td>
                            <td className="border border-black p-0 align-middle">
                              <SurveyRecordResultInput
                                key={parameter.id}
                                parameter={parameter}
                                disabled={isParameterEntryDisabled}
                                onSaved={handleParameterSaved}
                              />
                            </td>
                            <td className="border border-black p-0 align-middle">
                              <SurveyRecordNoteInput
                                key={parameter.id}
                                parameter={parameter}
                                disabled={isParameterEntryDisabled}
                                onSaved={handleParameterSaved}
                              />
                            </td>
                            <td className="border border-black p-0 align-middle">
                              <SurveyRecordParameterImageCell
                                parameter={parameter}
                                readOnly={isParameterEntryDisabled}
                                onChanged={requestRefresh}
                              />
                            </td>
                            <td className="break-words border border-black px-2 py-2 text-center align-middle text-sm leading-5">
                              {getPersonLabel(parameter.recordedBy)}
                              {parameter.recorded_at ? (
                                <span className="mt-1 block text-xs text-gray-600">
                                  {formatRecordDateTime(parameter.recorded_at)}
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        ));
                      }),
                    ];
                  })
                )}
              </tbody>
            </table>
          )}

          <SurveyRecordApprovals record={record} onChanged={requestRefresh} />
        </div>
      </div>

      <Dialog
        open={headerDraft !== null}
        onOpenChange={(open) => {
          if (!open && !isSavingHeader) setHeaderDraft(null);
        }}
      >
        <DialogContent className="font-sans sm:max-w-lg">
          <form onSubmit={(event) => void saveHeader(event)}>
            <DialogHeader>
              <DialogTitle>Sửa thông tin phiếu khảo sát</DialogTitle>
              <DialogDescription>
                Chỉ chỉnh sửa được trước khi Người kiểm tra ký.
              </DialogDescription>
            </DialogHeader>
            {headerDraft ? (
              <div className="mt-4 grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="record-title">Tiêu đề *</Label>
                  <Input
                    id="record-title"
                    value={headerDraft.title}
                    maxLength={255}
                    disabled={isSavingHeader}
                    autoFocus
                    onChange={(event) => updateDraft("title", event.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="record-project">Dự án</Label>
                    <Input
                      id="record-project"
                      value={headerDraft.project}
                      maxLength={255}
                      disabled={isSavingHeader}
                      onChange={(event) =>
                        updateDraft("project", event.target.value)
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="record-date">Ngày khảo sát</Label>
                    <Input
                      id="record-date"
                      type="date"
                      value={headerDraft.survey_date}
                      disabled={isSavingHeader}
                      onChange={(event) =>
                        updateDraft("survey_date", event.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="record-location">Địa điểm</Label>
                  <Input
                    id="record-location"
                    value={headerDraft.location}
                    maxLength={255}
                    disabled={isSavingHeader}
                    onChange={(event) =>
                      updateDraft("location", event.target.value)
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="record-description">Mô tả</Label>
                  <Textarea
                    id="record-description"
                    rows={3}
                    value={headerDraft.description}
                    disabled={isSavingHeader}
                    onChange={(event) =>
                      updateDraft("description", event.target.value)
                    }
                  />
                </div>
              </div>
            ) : null}
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                disabled={isSavingHeader}
                onClick={() => setHeaderDraft(null)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSavingHeader}>
                {isSavingHeader ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
