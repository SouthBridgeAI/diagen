import ora from "ora";
import { SupportedModel, Message, CritiqueHistoryItem } from "../types";
import { callAIStream } from "../utils/ai-adapters";
import { cleanDiagramWithTip20 } from "../utils/helpers";
import { reflectionPrompt } from "./prompts";
import path from "path";
import { TIP20_MODEL } from "../utils/constants";

export async function improveDiagramWithCritique(
  diagramCode: string,
  critique: string,
  id: string,
  typeofDiagram: string,
  model: SupportedModel,
  tempDir: string,
  saveLogStep?: (step: any) => void,
  inputData?: string,
  critiqueHistory?: CritiqueHistoryItem[],
  silent: boolean = true
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

  const critiqueSpinner = silent
    ? null
    : ora("Improving diagram with critique").start();

  const stream = await callAIStream(
    model,
    messages,
    undefined,
    path.join(tempDir, "prompts"),
    `critique_improvement_${id}`
  );

  let response = "";
  let tokenCount = 0;

  for await (const token of stream) {
    response += token;
    tokenCount++;
    if (critiqueSpinner)
      critiqueSpinner.text = `Improving diagram with critique (${tokenCount} tokens)`;
  }

  if (saveLogStep)
    saveLogStep({
      type: "critique_improvement",
      critique: critique,
      diagram: response,
      model: model,
    });

  if (critiqueSpinner)
    critiqueSpinner.succeed("New diagram generated from critique");

  const cleanedDiagram = await cleanDiagramWithTip20(response, TIP20_MODEL);

  if (saveLogStep)
    saveLogStep({
      type: "critique_improvement_cleaned",
      critique: critique,
      diagram: cleanedDiagram,
      model: TIP20_MODEL,
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
