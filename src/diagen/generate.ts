import ora from "ora";
import { SupportedModel } from "../types";
import { callAIStream } from "../utils/ai-adapters";
import { cleanDiagramWithTip20 } from "../utils/helpers";

export async function generateDiagram(
  data: string,
  dataDesc: string,
  typeofDiagram: string,
  model: SupportedModel,
  tempDir: string,
  saveLogStep?: (step: any) => void
) {
  const prompt = `DATA:\n\`\`\`\n${data}\n\`\`\`\n
  INSTRUCTION: Data is ${dataDesc}. Generate a landscape (left to right preferred) d2 diagram code (in d2 markdown blocks) for the DATA provided, covering ${typeofDiagram}. 1. Feel free to be creative
  2. Provide a single diagram only, with good visual design. 3. Make sure the code is for d2 and not mermaid.
  4. Keep it simple when possible.
  5. Don't make legends.`;

  let stream = await callAIStream(
    model,
    [
      {
        role: "user",
        content: prompt,
      },
    ],
    "You are a D2 diagram generator that can create beautiful and expressive d2 diagrams.",
    tempDir,
    "initial_diagram"
  );

  const spinner = ora("Generating diagram").start();

  let response = "";
  let tokenCount = 0;

  for await (const token of stream) {
    response += token;
    tokenCount++;
    spinner.text = `Generating diagram (${tokenCount} tokens)`;
  }

  if (saveLogStep)
    saveLogStep({ type: "diagram_generated", diagram: response, model: model });

  spinner.succeed("Diagram generated");

  // Clean the generated diagram
  const cleanedDiagram = await cleanDiagramWithTip20(
    response,
    "claude-3-haiku-20240307"
  );

  if (saveLogStep)
    saveLogStep({
      type: "diagram_cleaned",
      diagram: cleanedDiagram,
      model: "claude-3-haiku-20240307",
    });

  return cleanedDiagram;
}
