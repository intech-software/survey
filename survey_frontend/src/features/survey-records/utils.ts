import type {
  SurveyRecord,
  SurveyRecordPerson,
  SurveyRecordStage,
  SurveyRecordStatus,
  SurveyRecordStep,
} from "./types";

export const getRecordStages = (record?: SurveyRecord | null) =>
  [...(record?.stages ?? [])].sort(
    (left, right) => left.stage_order - right.stage_order,
  );

export const getStageSteps = (stage: SurveyRecordStage) =>
  [...(stage.steps ?? [])].sort(
    (left, right) => left.step_order - right.step_order,
  );

export const getStepParameters = (step: SurveyRecordStep) =>
  [...(step.parameters ?? [])].sort(
    (left, right) => left.parameter_order - right.parameter_order,
  );

export const getPersonLabel = (person?: SurveyRecordPerson | null) =>
  person?.name || person?.username || person?.email || "";

export const formatRecordDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
};

/** survey_date is a calendar date stored as UTC midnight. */
export const formatSurveyDate = (value?: string | null) => {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

export const toDateInputValue = (value?: string | null) =>
  value ? value.slice(0, 10) : "";

export const getRecordStatus = (record: SurveyRecord): SurveyRecordStatus => {
  if (record.approved_at) return "approved";
  if (record.checked_at) return "checked";
  return "draft";
};

export const RECORD_STATUS_LABELS: Record<SurveyRecordStatus, string> = {
  draft: "Chờ kiểm tra",
  checked: "Đang thực hiện",
  approved: "Đã phê duyệt",
};

const ERROR_MESSAGES: Record<string, string> = {
  "Survey template is inactive": "Template đã ngừng sử dụng.",
  "Survey template not found": "Không tìm thấy template.",
  "Survey record not found": "Không tìm thấy phiếu khảo sát.",
  "An approved survey record cannot be deleted":
    "Không thể xoá phiếu đã được phê duyệt.",
};

/** Extracts the API error message (in Vietnamese when known). */
export const getSurveyRecordErrorMessage = (
  error: unknown,
  fallback: string,
) => {
  const data = (
    error as { response?: { data?: { message?: unknown; error?: unknown } } }
  )?.response?.data;
  const raw = data?.message ?? data?.error;
  const message = Array.isArray(raw)
    ? raw.join("; ")
    : typeof raw === "string"
      ? raw
      : "";
  return message ? (ERROR_MESSAGES[message] ?? message) : fallback;
};
