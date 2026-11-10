import type {
  CreateSurveyTemplateStepPayload,
  SurveyTemplateStep,
  SurveyTemplateStepMutation,
  UpdateSurveyTemplateStepPayload,
} from "@/features/survey-templates/types";
import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const routes = API_ROUTES.surveyTemplates;

const fetchByParentId = async (parentId: string | number): Promise<SurveyTemplateStep[]> =>
  (await axiosClient.get(routes.steps(parentId))).data;

const fetchById = async (id: string | number): Promise<SurveyTemplateStep> =>
  (await axiosClient.get(routes.stepDetail(id))).data;

const create = async (
  parentId: string | number,
  payload: CreateSurveyTemplateStepPayload,
): Promise<SurveyTemplateStepMutation> =>
  (await axiosClient.post(routes.steps(parentId), payload)).data;

const update = async (
  id: string | number,
  payload: UpdateSurveyTemplateStepPayload,
): Promise<SurveyTemplateStepMutation> =>
  (await axiosClient.patch(routes.stepDetail(id), payload)).data;

const remove = async (id: string | number): Promise<SurveyTemplateStepMutation> =>
  (await axiosClient.delete(routes.stepDetail(id))).data;

const duplicate = async (id: string | number): Promise<SurveyTemplateStepMutation> =>
  (await axiosClient.post(`${routes.stepDetail(id)}/duplicate`)).data;

const move = async (
  id: string | number,
  direction: "up" | "down",
): Promise<SurveyTemplateStepMutation> =>
  (await axiosClient.patch(`${routes.stepDetail(id)}/move`, { direction })).data;

const surveyTemplateStepsService = {
  fetchByParentId,
  fetchById,
  create,
  update,
  delete: remove,
  duplicate,
  move,
};

export default surveyTemplateStepsService;
