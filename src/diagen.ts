import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { CritiqueHistoryItem, FixAttempt, SupportedModel } from "./types";
import { createTempDir, isClaudeModel, writeToFile } from "./utils/helpers";
import { generateDiagram } from "./diagen/generate";
import { checkAndFixDiagram } from "./diagen/fix";
import { visualReflect, visualReflectWithClaude } from "./diagen/visualReflect";
import { improveDiagramWithCritique } from "./diagen/improve";
import { render } from "./diagen/render";

interface DiagramRun {
  id: string;
  config: {
    generationModel: SupportedModel;
    critiqueModel: string;
    maxFixSteps: number;
    maxCritiqueRounds: number;
    provideFixHistory: boolean;
    provideCritiqueHistory: boolean;
    provideDataForCritique: boolean;
  };
  rounds: DiagramRound[];
  totalTime: number;
}

interface DiagramRound {
  critiqueNumber: number;
  initialDiagramCode: string;
  fixes: FixAttempt[];
  finalDiagramCode: string;
  renderedDiagramFilename: string;
  critique?: string;
  failureReason?: string;
  timeTaken: number;
}

export async function diagen(
  data: string,
  dataDesc: string,
  typeofDiagram: string,
  generationModel: SupportedModel,
  critiqueModel: string,
  maxFixSteps: number = 4,
  maxCritiqueRounds: number = 2,
  provideFixHistory: boolean = false,
  provideCritiqueHistory: boolean = false,
  provideDataForCritique: boolean = false
) {
  const runId = uuidv4().slice(0, 8);
  const tempDir = createTempDir();
  const logFilename = path.join(tempDir, `${runId}_log.json`);

  console.log("Saving outputs to ", tempDir);

  const run: DiagramRun = {
    id: runId,
    config: {
      generationModel,
      critiqueModel,
      maxFixSteps,
      maxCritiqueRounds,
      provideFixHistory,
      provideCritiqueHistory,
      provideDataForCritique,
    },
    rounds: [],
    totalTime: 0,
  };

  function saveLogStep() {
    writeToFile(logFilename, JSON.stringify(run, null, 2));
  }

  const startTime = Date.now();

  try {
    const initialDiagram = await generateDiagram(
      data,
      dataDesc,
      typeofDiagram,
      generationModel,
      tempDir,
      saveLogStep
    );

    let currentDiagramFilename = path.join(tempDir, "initial_diagram.d2");
    writeToFile(currentDiagramFilename, initialDiagram);

    let critiqueHistory: CritiqueHistoryItem[] = [];

    for (
      let critiqueRound = 0;
      critiqueRound <= maxCritiqueRounds;
      critiqueRound++
    ) {
      const roundStartTime = Date.now();
      const diagramId = `diagram_${critiqueRound.toString().padStart(2, "0")}`;

      run.rounds.push({
        critiqueNumber: critiqueRound,
        initialDiagramCode: initialDiagram,
        fixes: [],
        finalDiagramCode: "",
        renderedDiagramFilename: "",
        timeTaken: 0,
      });

      const diagramCheck = await checkAndFixDiagram(
        generationModel,
        currentDiagramFilename,
        diagramId,
        maxFixSteps,
        tempDir,
        provideFixHistory,
        (fixAttempt: FixAttempt) => {
          run.rounds[critiqueRound].fixes.push(fixAttempt);
          saveLogStep();
        }
      );

      if (!diagramCheck || !diagramCheck.success || !diagramCheck.d2file) {
        run.rounds[critiqueRound].failureReason = "Failed to fix diagram";
        saveLogStep();
        break;
      }

      run.rounds[critiqueRound].finalDiagramCode = diagramCheck.diagramCode;

      const renderResult = await render(
        diagramCheck.d2file,
        diagramId,
        tempDir,
        saveLogStep
      );

      if (!renderResult.success) {
        run.rounds[critiqueRound].failureReason = renderResult.err;
        saveLogStep();
        break;
      }

      run.rounds[critiqueRound].renderedDiagramFilename =
        renderResult.filename!;

      if (critiqueRound === maxCritiqueRounds) break;

      const critique = isClaudeModel(critiqueModel)
        ? await visualReflectWithClaude(
            renderResult.filename!,
            critiqueModel,
            "information flow",
            provideDataForCritique ? data : undefined
          )
        : await visualReflect(
            renderResult.filename!,
            critiqueModel,
            "information flow",
            provideDataForCritique ? data : undefined
          );

      run.rounds[critiqueRound].critique = critique;

      const newDiagram = await improveDiagramWithCritique(
        diagramCheck.diagramCode,
        critique,
        diagramId,
        typeofDiagram,
        generationModel,
        tempDir,
        saveLogStep,
        provideDataForCritique ? data : undefined,
        provideCritiqueHistory ? critiqueHistory : undefined
      );

      critiqueHistory.push(newDiagram.critique);

      currentDiagramFilename = path.join(tempDir, `${diagramId}_improved.d2`);
      writeToFile(currentDiagramFilename, newDiagram.cleanedDiagramCode);

      run.rounds[critiqueRound].timeTaken = Date.now() - roundStartTime;
      saveLogStep();
    }
  } catch (error) {
    console.error("Error in diagen:", error);
    run.rounds.push({
      critiqueNumber: run.rounds.length,
      initialDiagramCode: "",
      fixes: [],
      finalDiagramCode: "",
      renderedDiagramFilename: "",
      failureReason: (error as Error).message,
      timeTaken: 0,
    });
    saveLogStep();
  }

  run.totalTime = Date.now() - startTime;
  saveLogStep();

  // Pretty print results
  console.log("\nDiagram Generation Results:");
  console.log("---------------------------");
  console.log(`Run ID: ${run.id}`);
  console.log(`Total time: ${run.totalTime}ms`);
  console.log("\nConfig:");
  console.log(JSON.stringify(run.config, null, 2));
  console.log("\nRounds:");
  run.rounds.forEach((round, index) => {
    console.log(`\nRound ${index + 1}:`);
    console.log(`  Critique number: ${round.critiqueNumber}`);
    console.log(`  Number of fixes: ${round.fixes.length}`);
    console.log(`  Time taken: ${round.timeTaken}ms`);
    if (round.failureReason) {
      console.log(`  Failure reason: ${round.failureReason}`);
    }
    console.log(`  Rendered diagram: ${round.renderedDiagramFilename}`);
  });
}

(async () => {
  const data2 = fs.readFileSync("./tests/introducing-rakis.mdx", "utf8");
  await diagen(
    data2,
    "Article about a project called Rakis",
    "Architecture, key components and flow",
    // "gpt-4o",
    "claude-3-5-sonnet-20240620",
    // "gpt-4o-mini",
    // "gemini-1.5-flash-8b",
    // "gemini-1.5-flash",
    "gemini-1.5-pro-exp-0827",
    6,
    5,
    true,
    true,
    true
  );
  // const data = fs.readFileSync("./tests/compiled-code.txt", "utf8");
  // await diagen(
  //   data,
  //   "Codebase for a project called mandark",
  //   "code structure and key components",
  //   // "gpt-4o",
  //   "claude-3-5-sonnet-20240620",
  //   // "gpt-4o-mini",
  //   // "claude-3-haiku-20240307",
  //   // "gemini-1.5-flash-8b",
  //   // "gemini-1.5-flash",
  //   "gemini-1.5-pro-exp-0827",
  //   // "claude-3-haiku-20240307",
  //   // "claude-3-5-sonnet-20240620",
  //   6,
  //   2,
  //   true,
  //   true
  // );
})();
