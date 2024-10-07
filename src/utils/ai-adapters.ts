import OpenAI from "openai";
import { ClaudeModel, Message, OpenAIModel, SupportedModel } from "../types";
import Anthropic from "@anthropic-ai/sdk";
import { isClaudeModel, isOpenAIModel, writeToFile } from "./helpers";
import path from "path";
import type { ChatCompletionMessageParam } from "openai/resources";

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
      temperature: 0.1,
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
      temperature: 0.1,
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
      path.join(promptSaveLocation, `prompt_${promptId || ""}.json`),
      `SYSTEM PROMPT:\n${systemPrompt}\n${messages
        .map((message) => `\n${message.role}:\n${message.content}`)
        .join("\n")}`
    );

  if (isOpenAIModel(model)) {
    const res = await openaiAdapter.generate(model, messages, systemPrompt);

    for await (const chunk of res) {
      if (chunk.choices[0]?.delta?.content)
        yield chunk.choices[0]?.delta?.content || "";
    }

    return;
  } else if (isClaudeModel(model)) {
    const res = await claudeAdapter.generate(model, messages, systemPrompt);

    for await (const chunk of res) {
      if ("type" in chunk && chunk.type === "content_block_delta") {
        yield (chunk.delta as any).text || "";
      }
    }

    return;
  } else {
    throw new Error("Unsupported model type");
  }
}
