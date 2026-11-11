"use client";

import { Button } from "@/components/ui/button";
import { API_ROUTES } from "@/lib/api-routes";
import { surveyTemplatesService } from "@/services/index.service";
import { CircleOff, Copy, Edit2, Loader2, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { AiOutlineRight } from "react-icons/ai";
import useSWR from "swr";
import type { SurveyTemplate } from "../types";
import {
  formatDate,
  formatDateTime,
  getCreatorLabel,
  getErrorMessage,
  getSurveyTemplateStatusLabel,
  isSurveyTemplateActive,
} from "../utils";
import SurveyTemplateStages from "./survey-template-stages";
import { TemplateTreeContext } from "./template-tree-context";
import { useSurveyTemplateDialogs } from "./use-survey-template-dialogs";

function DetailHeader({
  title,
  onClose,
  children,
}: {
  title?: string;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2 border-b border-gray-200 pb-2">
      <div className="flex min-w-0 items-center gap-2">
        <Link className="shrink-0" href="/templates">
          Template
        </Link>
        {title ? (
          <>
            <AiOutlineRight className="shrink-0" />
            <p className="truncate" title={title}>
              {title}
            </p>
          </>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {children}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={onClose}
          aria-label="Thoát detail"
          title="Đóng"
        >
          <X className="size-5" />
        </Button>
      </div>
    </div>
  );
}

export default function SurveyTemplateDetail({
  templateId,
  onClose,
  onDeleted,
}: {
  templateId: number;
  onClose: () => void;
  onDeleted?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const { data: templates } = useSWR<SurveyTemplate[]>(
    API_ROUTES.surveyTemplates.base,
    surveyTemplatesService.fetchAll,
  );
  const listTemplate = useMemo(
    () => templates?.find((template) => template.id === templateId) ?? null,
    [templates, templateId],
  );
  const {
    data: fetchedTemplate,
    error: detailError,
    isLoading,
    mutate,
  } = useSWR(
    API_ROUTES.surveyTemplates.detail(templateId),
    () => surveyTemplatesService.fetchById(templateId),
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );
  const { dialogs, isSubmitting, openEdit, openClone, openDelete, openDeactivate } =
    useSurveyTemplateDialogs({
      onDeleted,
      onCreated: (created) =>
        router.push(`/templates/${created.id}`, { scroll: false }),
    });

  const template: SurveyTemplate | null = fetchedTemplate ?? listTemplate;

  if (!template) {
    return (
      <div className="w-full">
        <DetailHeader onClose={onClose} />
        {isLoading ? (
          <div className="flex min-h-56 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {getErrorMessage(detailError, "Không tìm thấy template khảo sát.")}
          </div>
        )}
      </div>
    );
  }

  const isActive = isSurveyTemplateActive(template);
  const errorMessage = detailError
    ? getErrorMessage(detailError, "Không thể tải dữ liệu mới nhất của template.")
    : null;
  const actionClassName = "font-sans max-sm:size-9 max-sm:px-0";

  return (
    <TemplateTreeContext.Provider
      value={{ template: fetchedTemplate, mutate, isLoading, error: detailError }}
    >
    <div className="w-full">
      <DetailHeader
        title={`${template.code} - ${template.name}`}
        onClose={onClose}
      >
        <Button
          type="button"
          variant="outline"
          className={actionClassName}
          onClick={() => openClone(template)}
          disabled={isSubmitting}
          title="Nhân bản thành phiên bản mới"
        >
          <Copy className="size-4" />
          <span className="max-sm:sr-only">Nhân bản</span>
        </Button>
        <Button
          type="button"
          className={`${actionClassName} bg-slate-900 text-white hover:bg-slate-800`}
          onClick={() => openEdit(template)}
          disabled={isSubmitting}
          title="Sửa thông tin template"
        >
          <Edit2 className="size-4" />
          <span className="max-sm:sr-only">Edit</span>
        </Button>
        {isActive ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            onClick={() => openDeactivate(template)}
            disabled={isSubmitting}
            title="Ngừng sử dụng"
            aria-label="Ngừng sử dụng template"
          >
            <CircleOff className="size-5" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => openDelete(template)}
          disabled={isSubmitting}
          title="Xóa template"
          aria-label="Xóa template"
        >
          <Trash2 className="size-5" />
        </Button>
      </DetailHeader>

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

      <div className="mt-2 overflow-x-auto md:mt-4">
        <div
          className="mx-auto min-w-[760px] max-w-[1100px] bg-white text-[15px] leading-6 text-black antialiased [text-rendering:optimizeLegibility]"
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
      {dialogs}
    </div>
    </TemplateTreeContext.Provider>
  );
}
