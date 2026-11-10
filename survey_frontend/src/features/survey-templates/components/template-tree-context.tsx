"use client";

import { createContext, useContext } from "react";
import type { KeyedMutator } from "swr";
import type { SurveyTemplateTree } from "../types";

export const TemplateTreeContext = createContext<{
  template?: SurveyTemplateTree;
  mutate: KeyedMutator<SurveyTemplateTree>;
  isLoading: boolean;
  error: unknown;
} | null>(null);

export function useTemplateTree() {
  const context = useContext(TemplateTreeContext);
  if (!context) throw new Error("TemplateTreeContext is required");
  return context;
}
