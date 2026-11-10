import type {
  CreateSurveyTemplateParameterPayload,
  SurveyTemplateParameter,
  SurveyTemplateParameterMutation,
  UpdateSurveyTemplateParameterPayload,
} from "@/features/survey-templates/types";
import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const routes = API_ROUTES.surveyTemplates;

const fetchByParentId = async (parentId: string | number): Promise<SurveyTemplateParameter[]> =>
  (await axiosClient.get(routes.parameters(parentId))).data;

const fetchById = async (id: string | number): Promise<SurveyTemplateParameter> =>
  (await axiosClient.get(routes.parameterDetail(id))).data;

const create = async (
  parentId: string | number,
  payload: CreateSurveyTemplateParameterPayload,
): Promise<SurveyTemplateParameterMutation> =>
  (await axiosClient.post(routes.parameters(parentId), payload)).data;

const update = async (
  id: string | number,
  payload: UpdateSurveyTemplateParameterPayload,
): Promise<SurveyTemplateParameterMutation> =>
  (await axiosClient.patch(routes.parameterDetail(id), payload)).data;

const remove = async (id: string | number): Promise<SurveyTemplateParameterMutation> =>
  (await axiosClient.delete(routes.parameterDetail(id))).data;

const duplicate = async (id: string | number): Promise<SurveyTemplateParameterMutation> =>
  (await axiosClient.post(`${routes.parameterDetail(id)}/duplicate`)).data;

const move = async (
  id: string | number,
  direction: "up" | "down",
): Promise<SurveyTemplateParameterMutation> =>
  (await axiosClient.patch(`${routes.parameterDetail(id)}/move`, { direction })).data;

const surveyTemplateParametersService = {
  fetchByParentId,
  fetchById,
  create,
  update,
  delete: remove,
  duplicate,
  move,
};

export default surveyTemplateParametersService;
