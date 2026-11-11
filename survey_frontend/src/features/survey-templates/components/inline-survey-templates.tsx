"use client";

import { Button } from "@/components/ui/button";
import { useScrollRestoration } from "@/hooks/use-scroll-restoration";
import { API_ROUTES } from "@/lib/api-routes";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import { surveyTemplatesService } from "@/services/index.service";
import useSearchStore from "@/store/search.store";
import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useMemo, useRef } from "react";
import { AiOutlineRight } from "react-icons/ai";
import useSWR from "swr";
import type { SurveyTemplate } from "../types";
import { getErrorMessage } from "../utils";
import ItemSurveyTemplate from "./item-survey-template";
import { useSurveyTemplateDialogs } from "./use-survey-template-dialogs";

const formatDateGroup = (value?: string | null) => {
  if (!value) return "Không rõ ngày tạo";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("vi-VN");
};

const getDateGroupKey = (value?: string | null) => {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const groupTemplatesByCreationDate = (templates: SurveyTemplate[]) => {
  const groups: { key: string; label: string; templates: SurveyTemplate[] }[] =
    [];
  const groupMap = new Map<string, (typeof groups)[number]>();

  templates.forEach((template) => {
    const key = getDateGroupKey(template.created_at);
    const existingGroup = groupMap.get(key);
    if (existingGroup) {
      existingGroup.templates.push(template);
      return;
    }
    const group = {
      key,
      label: formatDateGroup(template.created_at),
      templates: [template],
    };
    groups.push(group);
    groupMap.set(key, group);
  });

  return groups;
};

const getTime = (value?: string | null) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
};

/**
 * Template list, laid out like EBR's semi-finished lot list. Rendered full
 * width on /templates and as the left panel on /templates/[id].
 */
export default function InlineSurveyTemplates() {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[getSearchScopePath(pathname)] ?? "",
  );
  const isSearching = searchKeyword.trim().length > 0;
  const activeTemplateId = pathname.startsWith("/templates/")
    ? decodeURIComponent(pathname.replace("/templates/", ""))
    : null;

  const { data, error, isLoading } = useSWR(
    API_ROUTES.surveyTemplates.base,
    surveyTemplatesService.fetchAll,
  );

  const { dialogs, openCreate } = useSurveyTemplateDialogs({
    onCreated: (template) =>
      router.push(`/templates/${template.id}`, { scroll: false }),
  });

  const filteredTemplates = useMemo(
    () =>
      [...(data ?? [])]
        .sort(
          (first, second) =>
            getTime(second.created_at) - getTime(first.created_at) ||
            second.id - first.id,
        )
        .filter((template) =>
          matchesSearchKeyword(
            [template.code, template.name, template.description, template.version],
            searchKeyword,
          ),
        ),
    [data, searchKeyword],
  );
  const groupedTemplates = useMemo(
    () => groupTemplatesByCreationDate(filteredTemplates),
    [filteredTemplates],
  );

  const { saveScrollPosition } = useScrollRestoration({
    ref: containerRef,
    storageKey: "surveyTemplateListScroll",
    restoreSignal: `${filteredTemplates.length}:${pathname}`,
  });

  const handleClick = (templateId: number) => {
    saveScrollPosition({ restoreOnNextFrame: true });
    router.push(`/templates/${templateId}`, { scroll: false });
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md"
    >
      <div className="sticky top-0 z-10 w-full bg-white p-2">
        <div className="flex w-full items-center justify-between gap-2 border-b border-gray-200 bg-white pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <AiOutlineRight className="shrink-0" />
            <Link href="/templates" className="truncate">
              Template phiếu khảo sát
            </Link>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0 bg-slate-900 text-white hover:bg-slate-800"
            onClick={openCreate}
            title="Tạo template khảo sát"
          >
            <Plus className="size-4" />
            Thêm mới
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 pt-0">
        {isLoading && !data ? (
          Array.from({ length: 8 }).map((_, index) => (
            <ItemSurveyTemplate key={index} template={null} onClick={() => {}} />
          ))
        ) : error && !data ? (
          <p className="p-4 text-center text-sm text-red-600">
            {getErrorMessage(error, "Không thể tải danh sách template.")}
          </p>
        ) : groupedTemplates.length > 0 ? (
          groupedTemplates.map((group) => (
            <Fragment key={group.key}>
              <div className="border-b bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900">
                {group.label}
              </div>
              {group.templates.map((template) => (
                <ItemSurveyTemplate
                  key={template.id}
                  template={template}
                  isActive={activeTemplateId === String(template.id)}
                  onClick={() => handleClick(template.id)}
                />
              ))}
            </Fragment>
          ))
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            {isSearching
              ? "Không có template nào khớp với từ khóa tìm kiếm."
              : "Chưa có template khảo sát nào. Bấm “Thêm mới” để tạo template đầu tiên."}
          </p>
        )}
      </div>

      {dialogs}
    </div>
  );
}
