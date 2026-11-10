import type {
  CopySurveyTemplatePayload,
  CreateSurveyTemplatePayload,
  SurveyTemplate,
  SurveyTemplateTree,
  UpdateSurveyTemplatePayload,
} from "@/features/survey-templates/types";
import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const routes = API_ROUTES.surveyTemplates;

const fetchAll = async (): Promise<SurveyTemplate[]> =>
  (await axiosClient.get(routes.base)).data;

const fetchById = async (
  templateId: string | number,
): Promise<SurveyTemplateTree> =>
  (await axiosClient.get(routes.detail(templateId))).data;

const create = async (
  payload: CreateSurveyTemplatePayload,
): Promise<SurveyTemplate> => (await axiosClient.post(routes.base, payload)).data;

const copy = async (
  payload: CopySurveyTemplatePayload,
): Promise<SurveyTemplate> => (await axiosClient.post(routes.copy, payload)).data;

const update = async (
  templateId: string | number,
  payload: UpdateSurveyTemplatePayload,
): Promise<SurveyTemplate> =>
  (await axiosClient.patch(routes.detail(templateId), payload)).data;

const remove = async (templateId: string | number): Promise<SurveyTemplate> =>
  (await axiosClient.delete(routes.detail(templateId))).data;

const surveyTemplatesService = {
  fetchAll,
  fetchById,
  create,
  copy,
  update,
  delete: remove,
};

export default surveyTemplatesService;
