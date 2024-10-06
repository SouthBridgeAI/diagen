export type { ChatModel as OpenAIModel } from "openai/resources";
export { Model as ClaudeModel } from "@anthropic-ai/sdk/resources";

import type { ChatModel as OpenAIModel } from "openai/resources";
import { Model as ClaudeModel } from "@anthropic-ai/sdk/resources";

export type SupportedModel = OpenAIModel | ClaudeModel;

export type FixAttempt = {
  errors: string;
  fixedDiagram: string;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
};
