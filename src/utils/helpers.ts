import fs from "fs";
import path from "path";
import { ClaudeModel, OpenAIModel, SupportedModel } from "../types";
import ora from "ora";
import { tip20streaming } from "tip20";

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
