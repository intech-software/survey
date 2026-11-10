export type SurveyTemplateCreator = {
  id?: string | number;
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

export const SURVEY_TEMPLATE_STATUSES = ["active", "inactive"] as const;

export type SurveyTemplateStatus = (typeof SURVEY_TEMPLATE_STATUSES)[number];

export type SurveyTemplate = {
  id: number;
  code: string;
  name: string;
  version: number;
  description?: string | null;
  status?: SurveyTemplateStatus;
  created_by_id?: string | number | null;
  createdBy?: SurveyTemplateCreator | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateSurveyTemplatePayload = {
  code: string;
  name: string;
  version?: number;
  description?: string | null;
};

export type CopySurveyTemplatePayload = Partial<CreateSurveyTemplatePayload> & {
  source_template_id: number;
};

export type UpdateSurveyTemplatePayload =
  Partial<CreateSurveyTemplatePayload> & {
    status?: SurveyTemplateStatus;
  };

export type SurveyTemplateStage = {
  id: number;
  survey_template_id?: number;
  stage_name: string;
  stage_order: number;
  created_by_id?: string | number | null;
  createdBy?: SurveyTemplateCreator | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateSurveyTemplateStagePayload = {
  insert?: boolean;
  stage_name: string;
  stage_order: number;
};

export type UpdateSurveyTemplateStagePayload =
  Partial<CreateSurveyTemplateStagePayload>;

export type SurveyTemplateStep = {
  id: number;
  survey_template_stage_id?: number;
  step_name: string;
  step_order: number;
  created_by_id?: string | number | null;
  createdBy?: SurveyTemplateCreator | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateSurveyTemplateStepPayload = {
  step_name: string;
  step_order: number;
};

export type UpdateSurveyTemplateStepPayload =
  Partial<CreateSurveyTemplateStepPayload>;

export const SURVEY_PARAMETER_DATA_TYPES = [
  "text",
  "number",
  "decimal",
  "boolean",
  "date",
  "datetime",
  "select",
] as const;

export type SurveyParameterDataType =
  (typeof SURVEY_PARAMETER_DATA_TYPES)[number];

export type SurveyTemplateParameter = {
  id: number;
  survey_template_step_id?: number;
  parameter_name: string;
  data_type: SurveyParameterDataType;
  unit?: string | null;
  requirement: string;
  parameter_order: number;
  created_by_id?: string | number | null;
  createdBy?: SurveyTemplateCreator | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateSurveyTemplateParameterPayload = {
  parameter_name: string;
  data_type: SurveyParameterDataType;
  unit?: string | null;
  requirement: string;
  parameter_order: number;
};

export type UpdateSurveyTemplateParameterPayload =
  Partial<CreateSurveyTemplateParameterPayload>;

export type TemplateNodeMutationResult<T> = T & { siblings: T[] };

export type SurveyTemplateParameterMutation =
  TemplateNodeMutationResult<SurveyTemplateParameter>;
export type SurveyTemplateStepTree = SurveyTemplateStep & {
  parameters: SurveyTemplateParameter[];
};
export type SurveyTemplateStepMutation =
  TemplateNodeMutationResult<SurveyTemplateStep> & {
    parameters?: SurveyTemplateParameter[];
  };
export type SurveyTemplateStageMutation =
  TemplateNodeMutationResult<SurveyTemplateStage> & {
    steps?: SurveyTemplateStepTree[];
  };

export type SurveyTemplateStageTree = SurveyTemplateStage & {
  steps: SurveyTemplateStepTree[];
};
export type SurveyTemplateTree = SurveyTemplate & {
  stages: SurveyTemplateStageTree[];
};
