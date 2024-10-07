import { SupportedModel, FixAttempt, Message } from "../types";
import { callAIStream } from "../utils/ai-adapters";
import {
  cleanDiagramWithTip20,
  lineTag,
  removeLineTag,
  writeToFile,
} from "../utils/helpers";
import { render } from "./render";
import fs from "fs";
import path from "path";
import ora from "ora";
import { fixPrompt } from "./prompts";

type FixResult =
  | {
      success: false;
      error: string;
      fixAttempts: number;
    }
  | {
      success: true;
      d2file: string;
      outputImage: string;
      diagramCode: string;
      fixAttempts: number;
    };

export async function checkAndFixDiagram(
  model: SupportedModel,
  diagramFilename: string,
  diagramId: string,
  fixRounds: number,
  tempDir: string,
  provideFixHistory: boolean = false,
  saveFixAttempt: (fixAttempt: FixAttempt) => void
): Promise<FixResult> {
  const fixHistory: FixAttempt[] = [];
  const initialDiagramCode = fs.readFileSync(diagramFilename, "utf-8");

  const checkSpinner = ora(`Checking diagram (${diagramId})`).start();

  const initialRenderResult = await render(
    diagramFilename,
    `${diagramId}_original`,
    tempDir
  );

  if (initialRenderResult.success && initialRenderResult.filename) {
    checkSpinner.succeed(`Diagram rendered successfully (${diagramId})`);
    return {
      success: true,
      d2file: diagramFilename,
      outputImage: initialRenderResult.filename,
      diagramCode: initialDiagramCode,
      fixAttempts: 0,
    };
  }

  checkSpinner.fail(`Rendering failed (${diagramId}), trying to fix...`);

  let latestDiagramCode = initialDiagramCode;
  let fixAttempts = 0;

  for (let i = 0; i < fixRounds; i++) {
    fixAttempts++;
    const fixDiagramId = `${diagramId}_fixed_${i.toString().padStart(2, "0")}`;

    const fixSpinner = ora(
      `Fixing diagram (${diagramId}), try ${i + 1}`
    ).start();

    let messages: Message[] = [];

    if (provideFixHistory) {
      fixHistory.forEach((attempt, index) => {
        if (index === 0) {
          messages.push({
            role: "user",
            content: fixPrompt(attempt.errors, initialDiagramCode),
          });
        } else {
          // TODO: Move this prompt out and join it with the other one like we do in visualReflect
          messages.push({
            role: "user",
            content: `The previous fix attempt resulted in the following errors:\n\`\`\`\n${attempt.errors}\n\`\`\`\nPlease fix these errors in the previously provided diagram.`,
          });
        }
        messages.push({
          role: "assistant",
          content: `Here's the fixed diagram code:\n\`\`\`d2\n${lineTag(
            attempt.fixedDiagram
          )}\n\`\`\``,
        });
      });
    }

    // Add the current attempt
    if (fixHistory.length > 0 && provideFixHistory) {
      messages.push({
        role: "user",
        content: `The previous fix attempt resulted in the following errors:\n\`\`\`\n${
          fixHistory[fixHistory.length - 1].errors
        }\n\`\`\`\nPlease fix these errors in the previously provided diagram.`,
      });
    } else {
      messages.push({
        role: "user",
        content: fixPrompt(initialRenderResult.err!, latestDiagramCode),
      });
    }

    const stream = await callAIStream(
      model,
      messages,
      undefined,
      tempDir,
      fixDiagramId
    );

    let response = "";
    let tokenCount = 0;

    for await (const token of stream) {
      response += token;
      tokenCount++;
      fixSpinner.text = `Fixing diagram errors (${tokenCount} tokens)`;
    }

    fixSpinner.succeed(`New diagram generated with fixes for (${diagramId})`);

    response = removeLineTag(response);

    const cleanedDiagram = await cleanDiagramWithTip20(
      response,
      "claude-3-haiku-20240307"
    );

    latestDiagramCode = cleanedDiagram;
    const latestDiagramFilename = path.join(tempDir, `${fixDiagramId}.d2`);
    writeToFile(latestDiagramFilename, latestDiagramCode);

    const renderSpinner = ora(`Checking diagram (${fixDiagramId})`).start();

    const renderResult = await render(
      latestDiagramFilename,
      fixDiagramId,
      tempDir
    );

    if (renderResult.success && renderResult.filename) {
      renderSpinner.succeed(`Diagram rendered successfully (${fixDiagramId})`);
      return {
        success: true,
        d2file: latestDiagramFilename,
        outputImage: renderResult.filename,
        diagramCode: latestDiagramCode,
        fixAttempts,
      };
    }

    renderSpinner.fail(`Rendering failed for ${fixDiagramId})`);

    const fixAttempt: FixAttempt = {
      diagramCode: latestDiagramCode,
      errors: renderResult.err!,
      fixedDiagram: cleanedDiagram,
      response: response,
    };

    fixHistory.push(fixAttempt);
    saveFixAttempt(fixAttempt);
  }

  return {
    success: false,
    error: `Failed to fix diagram after ${fixAttempts} attempts`,
    fixAttempts,
  };
}
