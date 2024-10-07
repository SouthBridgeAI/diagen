import { ClaudeModel, GeminiModel, SupportedModel } from "../types";

const GENERATIONMODELS: SupportedModel[] = [
  "claude-3-5-sonnet-20240620",
  "claude-3-haiku-20240307",
  "gpt-4o",
  "gpt-4o-mini",
  "gemini-1.5-pro-002",
  "gemini-1.5-flash-8b",
];

const CRITIQUEMODELS: (ClaudeModel | GeminiModel)[] = [
  "claude-3-5-sonnet-20240620",
  "claude-3-haiku-20240307",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro-002",
];
