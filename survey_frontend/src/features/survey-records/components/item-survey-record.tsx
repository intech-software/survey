import { Skeleton } from "@/components/ui/skeleton";
import type { SurveyRecord } from "../types";
import {
  RECORD_STATUS_LABELS,
  formatSurveyDate,
  getRecordStatus,
} from "../utils";

const STATUS_TEXT_COLORS = {
  draft: "text-amber-600",
  checked: "text-blue-600",
  approved: "text-green-600",
} as const;

/** One row of the survey record list (same layout as EBR's ItemProductOrder). */
export default function ItemSurveyRecord({
  record,
  onClick,
  isActive = false,
}: {
  record: SurveyRecord | null;
  onClick: () => void;
  isActive?: boolean;
}) {
  const status = record ? getRecordStatus(record) : null;
  const subtitle = record
    ? [record.template_code, record.project].filter(Boolean).join(" · ")
    : "";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={isActive ? "true" : undefined}
      className={`flex min-h-[100px] cursor-pointer items-center gap-4 border-b border-gray-200 px-3 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
        isActive ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"
      }`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="min-w-0 flex-1">
        {!record ? (
          <Skeleton className="mb-2 h-4 w-40" />
        ) : (
          <p className="line-clamp-2 text-sm font-bold text-gray-900">
            {record.title}
          </p>
        )}

        {!record ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <p className="mt-1 truncate text-sm text-gray-600">{subtitle}</p>
        )}
      </div>

      <div className="shrink-0 text-right">
        {!record ? (
          <Skeleton className="h-4 w-12" />
        ) : (
          <p className="text-sm text-gray-700">
            {formatSurveyDate(record.survey_date)}
          </p>
        )}

        {!record || !status ? (
          <Skeleton className="mt-2 h-3 w-20" />
        ) : (
          <p className={`mt-1 text-xs font-semibold ${STATUS_TEXT_COLORS[status]}`}>
            {RECORD_STATUS_LABELS[status]}
          </p>
        )}

        {!record ? (
          <Skeleton className="mt-2 h-5 w-24" />
        ) : (
          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
              record.approved_at
                ? "bg-green-50 text-green-700 ring-green-200"
                : "bg-red-50 text-red-700 ring-red-200"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                record.approved_at ? "bg-green-600" : "bg-red-600"
              }`}
            />
            {record.approved_at ? "Đã ký duyệt" : "Chưa ký duyệt"}
          </span>
        )}
      </div>
    </div>
  );
}
