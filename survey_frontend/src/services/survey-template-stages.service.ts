import type {
  CreateSurveyTemplateStagePayload,
  SurveyTemplateStage,
  SurveyTemplateStageMutation,
  UpdateSurveyTemplateStagePayload,
} from "@/features/survey-templates/types";
import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const routes = API_ROUTES.surveyTemplates;

const fetchByParentId = async (parentId: string | number): Promise<SurveyTemplateStage[]> =>
  (await axiosClient.get(routes.stages(parentId))).data;

const fetchById = async (id: string | number): Promise<SurveyTemplateStage> =>
  (await axiosClient.get(routes.stageDetail(id))).data;

const create = async (
  parentId: string | number,
  payload: CreateSurveyTemplateStagePayload,
): Promise<SurveyTemplateStageMutation> =>
  (await axiosClient.post(routes.stages(parentId), payload)).data;

const update = async (
  id: string | number,
  payload: UpdateSurveyTemplateStagePayload,
): Promise<SurveyTemplateStageMutation> =>
  (await axiosClient.patch(routes.stageDetail(id), payload)).data;

const remove = async (id: string | number): Promise<SurveyTemplateStageMutation> =>
  (await axiosClient.delete(routes.stageDetail(id))).data;

const duplicate = async (id: string | number): Promise<SurveyTemplateStageMutation> =>
  (await axiosClient.post(`${routes.stageDetail(id)}/duplicate`)).data;

const move = async (
  id: string | number,
  direction: "up" | "down",
): Promise<SurveyTemplateStageMutation> =>
  (await axiosClient.patch(`${routes.stageDetail(id)}/move`, { direction })).data;

const surveyTemplateStagesService = {
  fetchByParentId,
  fetchById,
  create,
  update,
  delete: remove,
  duplicate,
  move,
};

export default surveyTemplateStagesService;
