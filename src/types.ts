export type { ChatModel as OpenAIModel } from "openai/resources";
export { Model as ClaudeModel } from "@anthropic-ai/sdk/resources";

import type { ChatModel as OpenAIModel } from "openai/resources";
import { Model as ClaudeModel } from "@anthropic-ai/sdk/resources";

export type SupportedModel = OpenAIModel | ClaudeModel;

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
