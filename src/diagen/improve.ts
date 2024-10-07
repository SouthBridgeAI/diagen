import ora from "ora";
import { SupportedModel, Message, CritiqueHistoryItem } from "../types";
import { callAIStream } from "../utils/ai-adapters";
import { cleanDiagramWithTip20 } from "../utils/helpers";
import { reflectionPrompt } from "./prompts";

export async function improveDiagramWithCritique(
  diagramCode: string,
  critique: string,
  id: string,
  typeofDiagram: string,
  model: SupportedModel,
  tempDir: string,
  saveLogStep?: (step: any) => void,
  inputData?: string,
  critiqueHistory?: CritiqueHistoryItem[]
) {
  const messages: Message[] = [];

  critiqueHistory?.forEach((hCritique, index) => {
    if (index === 0) {
      messages.push({
        role: "user",
        content: reflectionPrompt(
          typeofDiagram,
          hCritique.critique,
          hCritique.diagramCode,
          inputData
        ),
      });
    } else {
      messages.push({
        role: "user",
        content: reflectionPrompt(typeofDiagram, hCritique.critique),
      });
    }

    messages.push({
      role: "assistant",
      content: hCritique.fullResponse,
    });
  });

  if (critiqueHistory?.length === 0) {
    messages.push({
      role: "user",
      content: reflectionPrompt(
        typeofDiagram,
        critique,
        diagramCode,
        inputData
      ),
    });
  } else {
    messages.push({
      role: "user",
      content: reflectionPrompt(typeofDiagram, critique),
    });
  }

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
      fullResponse: response,
      improvedDiagram: cleanedDiagram,
    },
  };
}
