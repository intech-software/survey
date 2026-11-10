"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CircleOff, Edit2, Trash2 } from "lucide-react";
import Image from "next/image";
import type { SurveyTemplate } from "../types";
import {
  formatDate,
  formatDateTime,
  getCreatorLabel,
  getSurveyTemplateStatusLabel,
  isSurveyTemplateActive,
} from "../utils";
import SurveyTemplateStages from "./survey-template-stages";

export default function SurveyTemplateDetail({
  template,
  isLoading = false,
  errorMessage,
  onClose,
  onEdit,
  onDelete,
  onDeactivate,
  isSubmitting = false,
}: {
  template: SurveyTemplate;
  isLoading?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeactivate: () => void;
  isSubmitting?: boolean;
}) {
  const isActive = isSurveyTemplateActive(template);

  return (
    <section className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            onClick={onClose}
            title="Quay lại danh sách template"
            aria-label="Quay lại danh sách template"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
              Chi tiết template khảo sát
            </h2>
            <p className="mt-2 break-words text-sm font-medium text-gray-600 md:text-base">
              {template.code} - {template.name}
            </p>
            <Badge
              variant="outline"
              className={`mt-2 ${
                isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-100 text-slate-600"
              }`}
            >
              {getSurveyTemplateStatusLabel(template)}
            </Badge>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            onClick={onEdit}
            disabled={isLoading || isSubmitting}
          >
            <Edit2 className="size-4" />
            Sửa
          </Button>
          {isActive ? (
            <Button
              type="button"
              variant="outline"
              onClick={onDeactivate}
              disabled={isLoading || isSubmitting}
            >
              <CircleOff className="size-4" />
              Ngừng sử dụng
            </Button>
          ) : null}
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={isSubmitting}
          >
            <Trash2 className="size-4" />
            Xóa
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-4 h-1 overflow-hidden rounded bg-blue-100">
          <div className="h-full w-1/2 animate-pulse rounded bg-blue-500" />
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded border bg-gray-50 p-2 sm:p-4">
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
                      height={30}
                      className="h-auto max-h-16 w-auto object-contain"
                      priority
                    />
                  </div>
                </td>
                <td
                  rowSpan={3}
                  className="h-40 break-words border border-black px-6 py-3 text-center align-middle text-xl font-bold uppercase leading-8"
                >
                  Phiếu khảo sát
                  <br />
                  {template.name}
                </td>
                <td className="h-[52px] break-words border border-black px-2 py-1.5 align-middle leading-5">
                  Mã hiệu: {template.code}
                </td>
              </tr>
              <tr>
                <td className="h-[52px] border border-black px-2 py-1.5 align-middle leading-5">
                  Ngày ban hành:
                  <br />
                  {formatDate(template.created_at)}
                </td>
              </tr>
              <tr>
                <td className="h-[52px] border border-black px-2 py-1.5 align-middle leading-5">
                  Lần ban hành: {String(template.version).padStart(2, "0")}
                </td>
              </tr>
            </tbody>
          </table>

          <table className="mt-6 w-full table-fixed border-collapse border border-black">
            <colgroup>
              <col className="w-[168px]" />
              <col />
              <col className="w-[120px]" />
              <col className="w-[180px]" />
            </colgroup>
            <tbody>
              <tr>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold leading-6">
                  Tên template:
                </th>
                <td className="h-12 break-words border border-black px-2 py-2 align-middle font-bold leading-6">
                  {template.name}
                </td>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold leading-6">
                  Mã template:
                </th>
                <td className="h-12 break-words border border-black px-2 py-2 align-middle font-bold leading-6">
                  {template.code}
                </td>
              </tr>
              <tr>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold leading-6">
                  Phiên bản:
                </th>
                <td className="h-12 border border-black px-2 py-2 align-middle font-bold leading-6">
                  {template.version}
                </td>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold leading-6">
                  Trạng thái:
                </th>
                <td className="h-12 border border-black px-2 py-2 align-middle leading-6">
                  {getSurveyTemplateStatusLabel(template)}
                </td>
              </tr>
              <tr>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold leading-6">
                  Mô tả:
                </th>
                <td
                  colSpan={3}
                  className="h-12 whitespace-pre-wrap break-words border border-black px-2 py-2 align-middle leading-6"
                >
                  {template.description || ""}
                </td>
              </tr>
              <tr>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold leading-6">
                  Người tạo:
                </th>
                <td className="h-12 border border-black px-2 py-2 align-middle leading-6">
                  {getCreatorLabel(template)}
                </td>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold leading-6">
                  Ngày tạo:
                </th>
                <td className="h-12 border border-black px-2 py-2 align-middle leading-6">
                  {formatDateTime(template.created_at)}
                </td>
              </tr>
            </tbody>
          </table>

          <SurveyTemplateStages templateId={template.id} />
        </div>
      </div>
    </section>
  );
}
