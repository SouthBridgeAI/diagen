import { v4 as uuidv4 } from "uuid";
import path from "path";
import {
  ClaudeModel,
  CritiqueHistoryItem,
  DiagramRun,
  FixAttempt,
  GeminiModel,
  SupportedModel,
} from "./types";
import {
  checkModelAuthExists,
  createTempDir,
  isCommandAvailable,
  writeToFile,
} from "./utils/helpers";
import { generateDiagram } from "./diagen/generate";
import { checkAndFixDiagram } from "./diagen/fix";
import { visualReflect } from "./diagen/visualReflect";
import { improveDiagramWithCritique } from "./diagen/improve";
import open from "open";
import fs from "fs";

/**
 *
 * @param data Large string data to use as the primary source for generating the diagram.
 * @param dataDesc Description of the data (few words up to a sentence).
 * @param diagramDesc Description of diagram to be generated.
 * @param generationModel Model to use to generate diagrams.
 * @param fixModel Model to use to fix broken diagrams. Claude sonnet recommended.
 * @param critiqueModel Model to use to do visual reflection to improve diagrams.
 * @param maxFixSteps Number of attempts allowed to fix broken diagrams.
 * @param maxCritiqueRounds Number of rounds of reflection to improve diagrams.
 * @param provideFixHistory Enable this to allow the model to remember previous attempts to fix diagrams.
 * @param provideCritiqueHistory Enable this to allow the model to remember previous attempts to improve diagrams.
 * @param provideDataForCritique Enable this to allow the model to use the data to improve diagrams. Increasers cost but improves results.
 * @param injectTempDir Custom directory to use for temporary files. If not provided, a temporary directory will be created.
 * @param openDiagrams Enable this to open the diagrams after they're generated.
 * @param silent Enable this to disable all console spinners and logs.
 */
export async function diagen(
  data: string,
  dataDesc: string,
  diagramDesc: string,
  generationModel: SupportedModel,
  fixModel: SupportedModel,
  critiqueModel: ClaudeModel | GeminiModel,
  maxFixSteps: number = 4,
  maxCritiqueRounds: number = 2,
  provideFixHistory: boolean = false,
  provideCritiqueHistory: boolean = false,
  provideDataForCritique: boolean = false,
  injectTempDir?: string,
  openDiagrams: boolean = false,
  silent: boolean = true
) {
  checkModelAuthExists(generationModel);
  checkModelAuthExists(fixModel);
  checkModelAuthExists(critiqueModel);

  const d2IsAvailable = await isCommandAvailable("d2");

  if (!d2IsAvailable) {
    throw new Error(
      "d2 is not available on your system. Please install it from https://d2lang.com/tour/install/"
    );
  }

  const runId = uuidv4().slice(0, 8);
  const tempDir = injectTempDir || createTempDir();
  const logFilename = path.join(tempDir, `${runId}_log.json`);

  if (!fs.existsSync(path.join(tempDir, "prompts"))) {
    fs.mkdirSync(path.join(tempDir, "prompts"), { recursive: true });
  }

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
      outputDir: tempDir,
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
      diagramDesc,
      generationModel,
      tempDir,
      saveLogStep,
      silent
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
        fixModel,
        currentDiagramFilename,
        diagramId,
        maxFixSteps,
        tempDir,
        provideFixHistory,
        (fixAttempt: FixAttempt) => {
          run.rounds[critiqueRound].fixes.push(fixAttempt);
          saveLogStep();
        },
        silent
      );

      if (!diagramCheck || !diagramCheck.success || !diagramCheck.d2file) {
        run.rounds[critiqueRound].failureReason = "Failed to fix diagram";
        saveLogStep();
        break;
      }

      run.rounds[critiqueRound].finalDiagramCode = diagramCheck.diagramCode;

      run.rounds[critiqueRound].renderedDiagramFilename =
        diagramCheck.outputImage;

      if (openDiagrams) {
        try {
          open(diagramCheck.outputImage);
        } catch (Err) {}
      }

      if (critiqueRound === maxCritiqueRounds) break;

      const critique = await visualReflect(
        diagramCheck.outputImage,
        critiqueModel,
        "information flow",
        provideDataForCritique ? data : undefined,
        1,
        silent
      );

      run.rounds[critiqueRound].critique = critique;

      const newDiagram = await improveDiagramWithCritique(
        diagramCheck.diagramCode,
        critique,
        diagramId,
        diagramDesc,
        generationModel,
        tempDir,
        saveLogStep,
        provideDataForCritique ? data : undefined,
        provideCritiqueHistory ? critiqueHistory : undefined,
        silent
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
  if (!silent) {
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

  return run;
}
