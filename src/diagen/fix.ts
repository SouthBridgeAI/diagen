import ora from "ora";
import { SupportedModel, FixAttempt, Message } from "../types";
import { callAIStream } from "../utils/ai-adapters";
import { cleanDiagramWithTip20, writeToFile } from "../utils/helpers";
import { render } from "./render";
import fs from "fs";

const fixPrompt = (errors: string, diagramCode?: string) => `${
  diagramCode ? `DIAGRAM: \n\n\`\`\`d2\n${diagramCode}\n\`\`\`\n` : ""
}
Errors in diagram code:\n\`\`\`\n${errors}\n\`\`\`\n
Explain why the errors are happening. Then fix the errors in the d2 diagram code provided, and return the fixed code. Keep an eye out for recurring errors and try new fixes.`;

export async function checkAndFixDiagram(
  logSteps: any[],
  model: SupportedModel,
  diagramFilename: string,
  diagramId: string,
  fixRounds: number,
  tempDir: string,
  provideFixHistory: boolean = false,
  saveLogStep?: (step: any) => void
) {
  const fixHistory: FixAttempt[] = [];

  const diagramCode = fs.readFileSync(diagramFilename, "utf-8");

  const spinner = ora(`Checking diagram (${diagramId})`).start();

  let { err, filename } = await render(
    diagramFilename,
    diagramId + "_original",
    saveLogStep
  );

  if (!err) {
    spinner.succeed(`Diagram rendered successfully (${diagramId})`);

    logSteps.push({
      type: "successful_render",
      attempt: diagramId,
      d2file: filename,
      outputImage: filename,
    });

    return {
      d2file: diagramFilename,
      outputImage: filename,
      diagramCode: diagramCode,
    };
  }

  spinner.fail(`Rendering failed (${diagramId}), trying to fix...`);

  let latestDiagramFilename = diagramFilename,
    latestDiagramCode = diagramCode;

  for (let i = 0; i < fixRounds; i++) {
    const fixDiagramId = diagramId + "_fixed_" + i;

    const fixSpinner = ora(
      `Fixing diagram (${diagramId}), try ${i + 1}`
    ).start();

    let messages: Message[] = [];

    if (fixHistory.length > 0 && provideFixHistory) {
      fixHistory.forEach((attempt) => {
        messages.push(
          {
            role: "user",
            content: fixPrompt(attempt.errors),
          },
          {
            role: "assistant",
            content: `Fixed diagram:\n\`\`\`d2\n${attempt.fixedDiagram}\n\`\`\``,
          }
        );
      });
    }

    messages.push({
      role: "user",
      content: fixPrompt(err!, latestDiagramCode),
    });

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

    if (saveLogStep)
      saveLogStep({
        type: "diagram_fixed",
        diagram: response,
        model: model,
        fixAttemptsLeft: fixRounds - i,
      });

    fixSpinner.succeed(`New diagram generated with fixes for (${diagramId})`);

    const cleanedDiagram = await cleanDiagramWithTip20(
      response,
      "claude-3-haiku-20240307"
    );

    if (saveLogStep)
      saveLogStep({
        type: "diagram_fixed_cleaned",
        diagram: cleanedDiagram,
        model: "claude-3-haiku-20240307",
      });

    latestDiagramFilename = `${tempDir}/${fixDiagramId}.d2`;
    latestDiagramCode = cleanedDiagram;

    writeToFile(latestDiagramFilename, latestDiagramCode);

    const spinner = ora(`Checking diagram (${fixDiagramId})`).start();

    const { err: err2, filename: filename2 } = await render(
      latestDiagramFilename,
      fixDiagramId,
      saveLogStep
    );

    err = err2;

    if (!err2) {
      spinner.succeed(`Diagram rendered successfully (${fixDiagramId})`);

      logSteps.push({
        type: "successful_render",
        attempt: fixDiagramId,
        d2file: latestDiagramFilename,
        outputImage: filename2,
      });

      return {
        d2file: latestDiagramFilename,
        outputImage: filename2,
        diagramCode: latestDiagramCode,
      };
    }

    spinner.fail(`Rendering failed for ${fixDiagramId})`);

    fixHistory.push({
      errors: err2,
      fixedDiagram: cleanedDiagram,
    });
  }
}
