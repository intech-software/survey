import type {
  CreateSurveyTemplateParameterPayload,
  CreateSurveyTemplateStagePayload,
  CreateSurveyTemplateStepPayload,
  UpdateSurveyTemplateParameterPayload,
  UpdateSurveyTemplateStagePayload,
  UpdateSurveyTemplateStepPayload,
} from "@/features/survey-templates/types";
import type {
  CreateSurveyRecordPayload,
  SurveyRecord,
  SurveyRecordParameter,
  SurveyRecordStage,
  SurveyRecordStep,
  UpdateSurveyRecordPayload,
  UpdateSurveyRecordResultPayload,
} from "@/features/survey-records/types";
import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const routes = API_ROUTES.surveyRecords;
type Id = string | number;

const fetchAll = async (): Promise<SurveyRecord[]> =>
  (await axiosClient.get(routes.base)).data;

const fetchById = async (recordId: Id): Promise<SurveyRecord> =>
  (await axiosClient.get(routes.detail(recordId))).data;

const create = async (
  payload: CreateSurveyRecordPayload,
): Promise<SurveyRecord> =>
  (await axiosClient.post(routes.base, payload)).data;

const update = async (
  recordId: Id,
  payload: UpdateSurveyRecordPayload,
): Promise<SurveyRecord> =>
  (await axiosClient.patch(routes.detail(recordId), payload)).data;

const remove = async (recordId: Id): Promise<SurveyRecord> =>
  (await axiosClient.delete(routes.detail(recordId))).data;

const check = async (recordId: Id): Promise<SurveyRecord> =>
  (await axiosClient.patch(routes.checkApproval(recordId))).data;

const approve = async (recordId: Id): Promise<SurveyRecord> =>
  (await axiosClient.patch(routes.finalApproval(recordId))).data;

const createStage = async (
  recordId: Id,
  payload: Omit<CreateSurveyTemplateStagePayload, "insert">,
): Promise<SurveyRecordStage> =>
  (await axiosClient.post(routes.stages(recordId), payload)).data;

const updateStage = async (
  stageId: Id,
  payload: Omit<UpdateSurveyTemplateStagePayload, "insert">,
): Promise<SurveyRecordStage> =>
  (await axiosClient.patch(routes.stageDetail(stageId), payload)).data;

const deleteStage = async (stageId: Id): Promise<SurveyRecordStage> =>
  (await axiosClient.delete(routes.stageDetail(stageId))).data;

const createStep = async (
  stageId: Id,
  payload: CreateSurveyTemplateStepPayload,
): Promise<SurveyRecordStep> =>
  (await axiosClient.post(routes.steps(stageId), payload)).data;

const updateStep = async (
  stepId: Id,
  payload: UpdateSurveyTemplateStepPayload,
): Promise<SurveyRecordStep> =>
  (await axiosClient.patch(routes.stepDetail(stepId), payload)).data;

const deleteStep = async (stepId: Id): Promise<SurveyRecordStep> =>
  (await axiosClient.delete(routes.stepDetail(stepId))).data;

const createParameter = async (
  stepId: Id,
  payload: CreateSurveyTemplateParameterPayload,
): Promise<SurveyRecordParameter> =>
  (await axiosClient.post(routes.parameters(stepId), payload)).data;

const updateParameter = async (
  parameterId: Id,
  payload: UpdateSurveyTemplateParameterPayload,
): Promise<SurveyRecordParameter> =>
  (await axiosClient.patch(routes.parameterDetail(parameterId), payload)).data;

const deleteParameter = async (
  parameterId: Id,
): Promise<SurveyRecordParameter> =>
  (await axiosClient.delete(routes.parameterDetail(parameterId))).data;

const updateParameterResult = async (
  parameterId: Id,
  payload: UpdateSurveyRecordResultPayload,
): Promise<SurveyRecordParameter> =>
  (await axiosClient.patch(routes.parameterResult(parameterId), payload)).data;

const deleteParameterImage = (parameterId: Id) =>
  updateParameterResult(parameterId, { result_image_path: null });

const uploadParameterImage = async (
  parameterId: Id,
  image: File,
): Promise<SurveyRecordParameter> => {
  const formData = new FormData();
  formData.append("image", image);
  const response = await axiosClient.post(
    routes.parameterImage(parameterId),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const surveyRecordsService = {
  fetchAll,
  fetchById,
  create,
  update,
  delete: remove,
  check,
  approve,
  createStage,
  updateStage,
  deleteStage,
  createStep,
  updateStep,
  deleteStep,
  createParameter,
  updateParameter,
  deleteParameter,
  updateParameterResult,
  deleteParameterImage,
  uploadParameterImage,
};

export default surveyRecordsService;
