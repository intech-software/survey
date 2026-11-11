"use client";

import { Button } from "@/components/ui/button";
import { useScrollRestoration } from "@/hooks/use-scroll-restoration";
import { API_ROUTES } from "@/lib/api-routes";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import surveyRecordsService from "@/services/survey-records.service";
import useSearchStore from "@/store/search.store";
import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useMemo, useRef, useState } from "react";
import { AiOutlineRight } from "react-icons/ai";
import useSWR from "swr";
import type { SurveyRecord } from "../types";
import { getPersonLabel, getSurveyRecordErrorMessage } from "../utils";
import CreateSurveyRecordDialog from "./create-survey-record-dialog";
import ItemSurveyRecord from "./item-survey-record";

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

const groupRecordsByCreationDate = (records: SurveyRecord[]) => {
  const groups: { key: string; label: string; records: SurveyRecord[] }[] = [];
  const groupMap = new Map<string, (typeof groups)[number]>();

  records.forEach((record) => {
    const key = getDateGroupKey(record.created_at);
    const existingGroup = groupMap.get(key);
    if (existingGroup) {
      existingGroup.records.push(record);
      return;
    }
    const group = {
      key,
      label: formatDateGroup(record.created_at),
      records: [record],
    };
    groups.push(group);
    groupMap.set(key, group);
  });

  return groups;
};

/**
 * Survey record list, laid out like EBR's semi-finished lot list. Rendered
 * full width on /home and as the left panel on /home/[id].
 */
export default function InlineSurveyRecords() {
  const router = useRouter();
  const pathname = usePathname();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[getSearchScopePath(pathname)] ?? "",
  );
  const isSearching = searchKeyword.trim().length > 0;
  const activeRecordId = pathname.startsWith("/home/")
    ? decodeURIComponent(pathname.replace("/home/", ""))
    : null;

  const { data, error, isLoading, mutate } = useSWR(
    API_ROUTES.surveyRecords.base,
    surveyRecordsService.fetchAll,
  );

  const filteredRecords = useMemo(
    () =>
      (data ?? []).filter((record) =>
        matchesSearchKeyword(
          [
            record.id,
            record.title,
            record.project,
            record.location,
            record.template_code,
            record.template_name,
            record.description,
            getPersonLabel(record.createdBy),
          ],
          searchKeyword,
        ),
      ),
    [data, searchKeyword],
  );
  const groupedRecords = useMemo(
    () => groupRecordsByCreationDate(filteredRecords),
    [filteredRecords],
  );

  const { saveScrollPosition } = useScrollRestoration({
    ref: containerRef,
    storageKey: "surveyRecordListScroll",
    restoreSignal: `${filteredRecords.length}:${pathname}`,
  });

  const handleClick = (recordId: string | number) => {
    saveScrollPosition({ restoreOnNextFrame: true });
    router.push(`/home/${recordId}`, { scroll: false });
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
            <Link href="/home" className="truncate">
              Phiếu khảo sát
            </Link>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0 bg-slate-900 text-white hover:bg-slate-800"
            onClick={() => setIsCreateOpen(true)}
            title="Tạo phiếu khảo sát từ template"
          >
            <Plus className="size-4" />
            Thêm mới
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 pt-0">
        {isLoading && !data ? (
          Array.from({ length: 8 }).map((_, index) => (
            <ItemSurveyRecord key={index} record={null} onClick={() => {}} />
          ))
        ) : error && !data ? (
          <p className="p-4 text-center text-sm text-red-600">
            {getSurveyRecordErrorMessage(
              error,
              "Không thể tải danh sách phiếu khảo sát.",
            )}
          </p>
        ) : groupedRecords.length > 0 ? (
          groupedRecords.map((group) => (
            <Fragment key={group.key}>
              <div className="border-b bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900">
                {group.label}
              </div>
              {group.records.map((record) => (
                <ItemSurveyRecord
                  key={record.id}
                  record={record}
                  isActive={activeRecordId === String(record.id)}
                  onClick={() => handleClick(record.id)}
                />
              ))}
            </Fragment>
          ))
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            {isSearching
              ? "Không tìm thấy phiếu phù hợp."
              : "Chưa có phiếu khảo sát nào. Bấm “Thêm mới” để tạo phiếu từ template."}
          </p>
        )}
      </div>

      <CreateSurveyRecordDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={async (record) => {
          await mutate();
          router.push(`/home/${record.id}`, { scroll: false });
        }}
      />
    </div>
  );
}
