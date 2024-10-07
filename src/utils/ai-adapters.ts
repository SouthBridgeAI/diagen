import OpenAI from "openai";
import {
  ClaudeModel,
  GeminiModel,
  Message,
  OpenAIModel,
  SupportedModel,
} from "../types";
import Anthropic from "@anthropic-ai/sdk";
import {
  isClaudeModel,
  isGeminiModel,
  isOpenAIModel,
  writeToFile,
} from "./helpers";
const { GoogleGenerativeAI } = require("@google/generative-ai");
import path from "path";
import type { ChatCompletionMessageParam } from "openai/resources";
import { GLOBAL_TEMPERATURE } from "./constants";

export const geminiAdapter = {
  generate: async (
    model: GeminiModel,
    messages: Message[],
    systemPrompt?: string
  ) => {
    if (!process.env.GEMINI_API_KEY)
      throw new Error("GEMINI_API_KEY is needed to use Gemini models");

    if (!messages.length || messages[messages.length - 1].role !== "user")
      throw new Error("Last message must be a user message for gemini models");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const geminiModel = genAI.getGenerativeModel({
      model,
    });

    const generationConfig = {
      temperature: GLOBAL_TEMPERATURE,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "text/plain",
    };

    const chatSession = geminiModel.startChat({
      generationConfig,
      history: messages.slice(0, -1).map((message) => ({
        role: message.role === "user" ? "user" : "model",
        parts: [{ text: message.content }],
      })),
      systemPrompt: systemPrompt,
    });

    const result = await chatSession.sendMessage(
      messages[messages.length - 1].content
    );

    return result.response.text();
  },
};

// Adapters
export const openaiAdapter = {
  generate: async (
    model: OpenAIModel,
    messages: Message[],
    systemPrompt?: string
  ) => {
    const client = new OpenAI();

    const updatedMessages: ChatCompletionMessageParam[] = systemPrompt
      ? [
          {
            role: "system",
            content: systemPrompt,
          },
          ...messages,
        ]
      : messages;

    const stream = await client.chat.completions.create({
      model,
      temperature: GLOBAL_TEMPERATURE,
      max_tokens: 8192,
      messages: updatedMessages,
      stream: true,
    });
    return stream;
  },
};

export const claudeAdapter = {
  generate: async (
    model: ClaudeModel,
    messages: Message[],
    systemPrompt?: string
  ) => {
    const client = new Anthropic();
    const stream = await client.messages.create({
      temperature: GLOBAL_TEMPERATURE,
      max_tokens: model.includes("3-5-sonnet") ? 8192 : 4096,
      model,
      system: systemPrompt,
      messages,
      stream: true,
    });
    return stream;
  },
};

// TODO: Make sure we translate system prompts properly
// TODO: Actually process the streams properly
export async function* callAIStream(
  model: SupportedModel,
  messages: Message[],
  systemPrompt?: string,
  promptSaveLocation?: string,
  promptId?: string
): AsyncGenerator<string, void, undefined> {
  if (promptSaveLocation)
    writeToFile(
      path.join(promptSaveLocation, `prompt_${promptId || ""}.txt`),
      `SYSTEM PROMPT:\n${systemPrompt}\n${messages
        .map(
          (message) =>
            `\n===================================================\n${message.role}:\n${message.content}`
        )
        .join("\n")}`
    );

  let fullMessage = "";

  if (isOpenAIModel(model)) {
    const res = await openaiAdapter.generate(model, messages, systemPrompt);

    for await (const chunk of res) {
      if (chunk.choices[0]?.delta?.content) {
        yield chunk.choices[0]?.delta?.content || "";
        fullMessage += chunk.choices[0]?.delta?.content || "";
      }
    }
  } else if (isClaudeModel(model)) {
    const res = await claudeAdapter.generate(model, messages, systemPrompt);

    for await (const chunk of res) {
      if ("type" in chunk && chunk.type === "content_block_delta") {
        yield (chunk.delta as any).text || "";
        fullMessage += (chunk.delta as any).text || "";
      }
    }
  } else if (isGeminiModel(model)) {
    const res = await geminiAdapter.generate(model, messages, systemPrompt);

    yield res;
    fullMessage = res;
  } else {
    throw new Error("Unsupported model type");
  }

  if (promptSaveLocation)
    writeToFile(
      path.join(promptSaveLocation, `prompt_${promptId || ""}_response.txt`),
      fullMessage
    );
}
