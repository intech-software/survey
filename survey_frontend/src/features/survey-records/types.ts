import type {
  SurveyParameterDataType,
  SurveyTemplate,
} from "@/features/survey-templates/types";

export type SurveyRecordPerson = {
  id?: string | number;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  avatar?: string | null;
};

export type SurveyRecordParameter = {
  id: number;
  survey_record_step_id?: number;
  source_template_parameter_id?: number | null;
  parameter_name: string;
  data_type: SurveyParameterDataType;
  unit?: string | null;
  requirement: string;
  parameter_order: number;
  result_value?: string | number | boolean | null;
  note?: string | null;
  result_image_path?: string | null;
  recorded_by_id?: string | number | null;
  recordedBy?: SurveyRecordPerson | null;
  recorded_at?: string | null;
};

export type SurveyRecordStep = {
  id: number;
  survey_record_stage_id?: number;
  source_template_step_id?: number | null;
  step_name: string;
  step_order: number;
  parameters?: SurveyRecordParameter[];
};

export type SurveyRecordStage = {
  id: number;
  survey_record_id?: number;
  source_template_stage_id?: number | null;
  stage_name: string;
  stage_order: number;
  steps?: SurveyRecordStep[];
};

export type SurveyRecord = {
  id: number;
  survey_template_id?: number | null;
  surveyTemplate?: SurveyTemplate | null;
  template_code: string;
  template_name: string;
  template_version: number;
  title: string;
  project?: string | null;
  location?: string | null;
  survey_date?: string | null;
  description?: string | null;
  created_by_id?: string | number | null;
  createdBy?: SurveyRecordPerson | null;
  created_at?: string | null;
  updated_at?: string | null;
  checked_by_id?: string | number | null;
  checked_at?: string | null;
  checkedBy?: SurveyRecordPerson | null;
  approved_by_id?: string | number | null;
  approved_at?: string | null;
  approvedBy?: SurveyRecordPerson | null;
  stages?: SurveyRecordStage[];
};

export type SurveyRecordHeaderPayload = {
  title?: string;
  project?: string | null;
  location?: string | null;
  survey_date?: string | null;
  description?: string | null;
};

export type CreateSurveyRecordPayload = SurveyRecordHeaderPayload & {
  survey_template_id: number;
  title: string;
};

export type UpdateSurveyRecordPayload = SurveyRecordHeaderPayload;

export type UpdateSurveyRecordResultPayload = {
  result_value?: string | number | boolean | null;
  note?: string | null;
  result_image_path?: string | null;
};

export type SurveyRecordStatus = "draft" | "checked" | "approved";
