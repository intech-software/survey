import type {
  SurveyTemplateTree,
  SurveyTemplateStageMutation,
  SurveyTemplateStepMutation,
  SurveyTemplateParameterMutation,
} from "./types";

// Sibling responses contain scalar fields. Preserve descendants already loaded
// in the detail cache, and use the returned subtree for new/copied nodes.
export function applyStageMutation(
  tree: SurveyTemplateTree,
  result: SurveyTemplateStageMutation,
): SurveyTemplateTree {
  return {
    ...tree,
    stages: result.siblings.map((stage) => ({
      ...stage,
      steps:
        stage.id === result.id && result.steps !== undefined
          ? result.steps
          : (tree.stages.find((current) => current.id === stage.id)?.steps ??
            []),
    })),
  };
}

export function applyStepMutation(
  tree: SurveyTemplateTree,
  stageId: number,
  result: SurveyTemplateStepMutation,
): SurveyTemplateTree {
  return {
    ...tree,
    stages: tree.stages.map((stage) =>
      stage.id !== stageId
        ? stage
        : {
            ...stage,
            steps: result.siblings.map((step) => ({
              ...step,
              parameters:
                step.id === result.id && result.parameters !== undefined
                  ? result.parameters
                  : (stage.steps.find((current) => current.id === step.id)
                      ?.parameters ?? []),
            })),
          },
    ),
  };
}

export function applyParameterMutation(
  tree: SurveyTemplateTree,
  stepId: number,
  result: SurveyTemplateParameterMutation,
): SurveyTemplateTree {
  return {
    ...tree,
    stages: tree.stages.map((stage) => ({
      ...stage,
      steps: stage.steps.map((step) =>
        step.id !== stepId
          ? step
          : {
              ...step,
              parameters: result.siblings,
            },
      ),
    })),
  };
}
