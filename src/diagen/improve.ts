import ora from "ora";
import { SupportedModel, Message } from "../types";
import { callAIStream } from "../utils/ai-adapters";
import { cleanDiagramWithTip20 } from "../utils/helpers";

export async function improveDiagramWithCritique(
  diagramCode: string,
  critique: string,
  id: string,
  typeofDiagram: string,
  model: SupportedModel,
  tempDir: string,
  saveLogStep?: (step: any) => void,
  inputData?: string,
  critiqueHistory?: {
    diagramCode: string;
    critique: string;
    improvedDiagram: string;
  }[]
) {
  // prettier-ignore
  const reflectionPrompt = (diagramCode: string, typeofDiagram: string, inputData?: string) =>
`${inputData ? `DATA: \n\`\`\`${inputData}\`\`\`\n` : ""}DIAGRAM: \n\n\`\`\`d2\n${diagramCode}\n\`\`\`\nAreas to improve:\n\`\`\`\n${critique}\n\`\`\`
Provided is a d2 ${typeofDiagram} diagram${inputData ? " generated from DATA" : ""}. Apply the critiques when possible to improve the diagram but don't make it too complex. Explain very shortly how you will improve, then generate and return the improved d2 diagram code.`;

  const messages = (
    critiqueHistory
      ? critiqueHistory
          .map((critique) => [
            {
              role: "user",
              content: reflectionPrompt(critique.diagramCode, typeofDiagram),
            },
            {
              role: "assistant",
              content: `Improved diagram:\n\`\`\`d2\n${critique.improvedDiagram}\n\`\`\``,
            },
          ])
          .flat()
      : []
  ) as Message[];

  messages.push({
    role: "user",
    content: reflectionPrompt(diagramCode, typeofDiagram, inputData),
  });

  const critiqueSpinner = ora("Improving diagram with critique").start();

  const stream = await callAIStream(
    model,
    messages,
    undefined,
    tempDir,
    `critique_improvement_${id}`
  );

  let response = "";
  let tokenCount = 0;

  for await (const token of stream) {
    response += token;
    tokenCount++;
    critiqueSpinner.text = `Improving diagram with critique (${tokenCount} tokens)`;
  }

  if (saveLogStep)
    saveLogStep({
      type: "critique_improvement",
      critique: critique,
      diagram: response,
      model: model,
    });

  critiqueSpinner.succeed("New diagram generated from critique");

  const cleanedDiagram = await cleanDiagramWithTip20(
    response,
    "claude-3-haiku-20240307"
  );

  if (saveLogStep)
    saveLogStep({
      type: "critique_improvement_cleaned",
      critique: critique,
      diagram: cleanedDiagram,
      model: "claude-3-haiku-20240307",
    });

  return {
    cleanedDiagramCode: cleanedDiagram,
    critique: {
      diagramCode,
      critique,
      improvedDiagram: cleanedDiagram,
    },
  };
}
