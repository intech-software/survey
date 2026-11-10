import type { SurveyTemplate } from "./types";

const isSurveyTemplateActive = (template: SurveyTemplate) =>
  template.status !== "inactive";

const getSurveyTemplateStatusLabel = (template: SurveyTemplate) =>
  isSurveyTemplateActive(template) ? "Active" : "Ngừng sử dụng";

const getCreatorLabel = (template: SurveyTemplate) =>
  template.createdBy?.name ??
  template.createdBy?.username ??
  template.createdBy?.email ??
  template.created_by_id ??
  "—";

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "—";

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "—";

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join("; ") : (message ?? fallback);
};

export {
  formatDate,
  formatDateTime,
  getCreatorLabel,
  getErrorMessage,
  getSurveyTemplateStatusLabel,
  isSurveyTemplateActive,
};
