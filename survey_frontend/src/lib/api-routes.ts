const AUTH = {
  login: "/auth/login",
  refreshToken: "/auth/refresh-token",
  logout: "/auth/logout",
};

const USERS = {
  me: "/users/me",
  uploadAvatar: "/users/me/avatar",
  changePassword: "/users/me/change-password",
  base: "/users",
  detail: (userId: string | number) => `/users/${userId}`,
};

const SURVEY_TEMPLATES = {
  base: "/survey-templates",
  copy: "/survey-templates/copy",
  detail: (templateId: string | number) => `/survey-templates/${templateId}`,
  stages: (templateId: string | number) =>
    `/survey-templates/${templateId}/stages`,
  stageDetail: (stageId: string | number) => `/survey-template-stages/${stageId}`,
  steps: (stageId: string | number) =>
    `/survey-template-stages/${stageId}/steps`,
  stepDetail: (stepId: string | number) => `/survey-template-steps/${stepId}`,
  parameters: (stepId: string | number) =>
    `/survey-template-steps/${stepId}/parameters`,
  parameterDetail: (parameterId: string | number) =>
    `/survey-template-parameters/${parameterId}`,
};

const SURVEY_RECORDS = {
  base: "/survey-records",
  detail: (recordId: string | number) => `/survey-records/${recordId}`,
  checkApproval: (recordId: string | number) =>
    `/survey-records/${recordId}/check-approval`,
  finalApproval: (recordId: string | number) =>
    `/survey-records/${recordId}/final-approval`,
  stages: (recordId: string | number) => `/survey-records/${recordId}/stages`,
  stageDetail: (stageId: string | number) => `/survey-record-stages/${stageId}`,
  steps: (stageId: string | number) => `/survey-record-stages/${stageId}/steps`,
  stepDetail: (stepId: string | number) => `/survey-record-steps/${stepId}`,
  parameters: (stepId: string | number) =>
    `/survey-record-steps/${stepId}/parameters`,
  parameterDetail: (parameterId: string | number) =>
    `/survey-record-parameters/${parameterId}`,
  parameterResult: (parameterId: string | number) =>
    `/survey-record-parameters/${parameterId}/result`,
  parameterImage: (parameterId: string | number) =>
    `/survey-record-parameters/${parameterId}/image`,
};

const INTERNAL = {
  auth: "/api/auth",
};

export const API_ROUTES = {
  auth: AUTH,
  users: USERS,
  internal: INTERNAL,
  surveyTemplates: SURVEY_TEMPLATES,
  surveyRecords: SURVEY_RECORDS,
};
