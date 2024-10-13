export type { ChatModel as OpenAIModel } from "openai/resources";
export { Model as ClaudeModel } from "@anthropic-ai/sdk/resources";

import type { ChatModel as OpenAIModel } from "openai/resources";
import { Model as ClaudeModel } from "@anthropic-ai/sdk/resources";

export type GeminiModel =
  | "gemini-1.5-flash-002"
  | "gemini-1.5-flash-8b"
  | "gemini-1.5-pro-002";

export type SupportedModel = OpenAIModel | ClaudeModel | GeminiModel;

export type FixAttempt = {
  diagramCode: string;
  errors: string;
  fixedDiagram: string;
  response: string;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type CritiqueHistoryItem = {
  diagramCode: string;
  critique: string;
  fullResponse: string;
  improvedDiagram: string;
};

export type DiagramRun = {
  id: string;
  config: {
    generationModel: SupportedModel;
    critiqueModel: string;
    maxFixSteps: number;
    maxCritiqueRounds: number;
    provideFixHistory: boolean;
    provideCritiqueHistory: boolean;
    provideDataForCritique: boolean;
    outputDir: string;
  };
  rounds: DiagramRound[];
  totalTime: number;
};

type DiagramRound = {
  critiqueNumber: number;
  initialDiagramCode: string;
  fixes: FixAttempt[];
  finalDiagramCode: string;
  renderedDiagramFilename: string;
  critique?: string;
  failureReason?: string;
  timeTaken: number;
};
