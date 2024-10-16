import fs from "fs";
import path from "path";
import {
  ClaudeModel,
  GeminiModel,
  OpenAIModel,
  SupportedModel,
} from "../types";
import ora from "ora";
import { tip20streaming } from "tip20";
import { exec } from "child_process";
import { tip20Status } from "./constants";

export function lineTag(input: string): string {
  // Split the input string into an array of lines
  const lines = input.split("\n");

  // Map over each line, adding the line number tag
  const taggedLines = lines.map((line, index) => {
    const lineNumber = index + 1;
    return `L${lineNumber}: ${line}`;
  });

  // Join the tagged lines back into a single string
  return taggedLines.join("\n");
}

export function removeLineTag(input: string): string {
  const lines = input.split("\n");
  const untaggedLines = lines.map((line) => {
    // Use a regular expression to match and remove the line tag
    return line.replace(/^L\d+:\s*/, "");
  });
  return untaggedLines.join("\n");
}

// Helper functions
export const createTempDir = () => {
  const saveDir = path.join(
    __dirname,
    `../../.diagen/${new Date().toISOString().replace(/[^0-9]/g, "")}`
  );
  if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
  return saveDir;
};

export const writeToFile = (filename: string, content: string) => {
  fs.writeFileSync(filename, content);
};

export const isOpenAIModel = (model: SupportedModel): model is OpenAIModel => {
  return typeof model === "string" && model.startsWith("gpt-");
};

export const isClaudeModel = (model: SupportedModel): model is ClaudeModel => {
  return typeof model === "string" && model.startsWith("claude-");
};

export const isGeminiModel = (model: SupportedModel): model is GeminiModel => {
  return typeof model === "string" && model.startsWith("gemini-");
};

export function isCommandAvailable(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`command -v ${command}`, (error) => {
      resolve(!error);
    });
  });
}

export const checkModelAuthExists = (
  model: SupportedModel,
  silent: boolean = false
) => {
  if (isClaudeModel(model) && !process.env.ANTHROPIC_API_KEY) {
    if (!silent)
      console.error(
        `ANTHROPIC_API_KEY is not set in the environment variables. Please set it (export ANTHROPIC_API_KEY=...) to use ${model}.`
      );

    return false;
  } else if (isGeminiModel(model) && !process.env.GEMINI_API_KEY) {
    if (!silent)
      console.error(
        `GEMINI_API_KEY is not set in the environment variables. Please set it (export GEMINI_API_KEY=...) to use ${model}.`
      );

    return false;
  } else if (isOpenAIModel(model) && !process.env.OPENAI_API_KEY) {
    if (!silent)
      console.error(
        `OPENAI_API_KEY is not set in the environment variables. Please set it (export OPENAI_API_KEY=...) to use ${model}.`
      );

    return false;
  }

  return true;
};

export async function cleanDiagramWithTip20(
  diagramCode: string,
  modelName: string,
  silent: boolean = true
): Promise<string> {
  if (tip20Status.disabled) {
    console.log("Attempting to clean diagram without tip20");

    const matchedDiagram = diagramCode.match(/```d2\n([\s\S]*?)\n```/g);
    if (matchedDiagram) {
      const cleanedDiagram = matchedDiagram[0]
        .replace(/```d2/g, "")
        .replace(/```/g, "")
        .trim();

      return cleanedDiagram;
    } else {
      throw new Error(
        "Could not clean diagram without tip20. Consider adding an Anthropic API key or running again!"
      );
    }
  }

  const spinner = silent ? null : ora("Cleaning diagram with tip20").start();
  let cleanedDiagram = "",
    tokenCount = 0;

  try {
    const cleanedResponsePackets = await tip20streaming(
      "d2",
      diagramCode,
      modelName,
      true
    );

    for await (const packet of cleanedResponsePackets) {
      if (packet.type === "token") {
        cleanedDiagram += packet.token;
        tokenCount++;
        if (spinner)
          spinner.text = `Cleaning diagram with tip20 (${tokenCount} tokens)`;
      }
      if (packet.type === "fullMessage") cleanedDiagram = packet.message;
    }

    if (spinner) spinner.succeed("Diagram cleaned with tip20");
  } catch (error) {
    if (spinner) spinner.fail("Failed to clean diagram with tip20");
    console.error("Error cleaning diagram:", error);
    cleanedDiagram = diagramCode; // Use original code if cleaning fails
  }

  return cleanedDiagram;
}
