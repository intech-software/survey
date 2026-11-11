import { Skeleton } from "@/components/ui/skeleton";
import type { SurveyTemplate } from "../types";
import {
  getCreatorLabel,
  getSurveyTemplateStatusLabel,
  isSurveyTemplateActive,
} from "../utils";

/** One row of the template list (same layout as EBR's ItemProductOrder). */
export default function ItemSurveyTemplate({
  template,
  onClick,
  isActive = false,
}: {
  template: SurveyTemplate | null;
  onClick: () => void;
  isActive?: boolean;
}) {
  const active = template ? isSurveyTemplateActive(template) : false;

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
        {!template ? (
          <Skeleton className="mb-2 h-4 w-40" />
        ) : (
          <p className="line-clamp-2 text-sm font-bold text-gray-900">
            {template.name}
          </p>
        )}

        {!template ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <p className="mt-1 truncate text-sm text-gray-600">{template.code}</p>
        )}
      </div>

      <div className="shrink-0 text-right">
        {!template ? (
          <Skeleton className="h-4 w-12" />
        ) : (
          <p className="text-sm text-gray-700">Phiên bản {template.version}</p>
        )}

        {!template ? (
          <Skeleton className="mt-2 h-3 w-20" />
        ) : (
          <p className="mt-1 max-w-40 truncate text-xs font-semibold text-amber-600">
            {getCreatorLabel(template)}
          </p>
        )}

        {!template ? (
          <Skeleton className="mt-2 h-5 w-24" />
        ) : (
          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
              active
                ? "bg-green-50 text-green-700 ring-green-200"
                : "bg-gray-100 text-gray-600 ring-gray-200"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                active ? "bg-green-600" : "bg-gray-400"
              }`}
            />
            {getSurveyTemplateStatusLabel(template)}
          </span>
        )}
      </div>
    </div>
  );
}
