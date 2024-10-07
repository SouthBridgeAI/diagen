import fs from "fs";
import path from "path";
import { ClaudeModel, OpenAIModel, SupportedModel } from "../types";
import ora from "ora";
import { tip20streaming } from "tip20";

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

export async function cleanDiagramWithTip20(
  diagramCode: string,
  modelName: string
): Promise<string> {
  const spinner = ora("Cleaning diagram with tip20").start();
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
        spinner.text = `Cleaning diagram with tip20 (${tokenCount} tokens)`;
      }
      if (packet.type === "fullMessage") cleanedDiagram = packet.message;
    }

    spinner.succeed("Diagram cleaned with tip20");
  } catch (error) {
    spinner.fail("Failed to clean diagram with tip20");
    console.error("Error cleaning diagram:", error);
    cleanedDiagram = diagramCode; // Use original code if cleaning fails
  }

  return cleanedDiagram;
}
