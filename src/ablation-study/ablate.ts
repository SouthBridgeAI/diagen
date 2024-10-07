import { diagen } from "../diagen";
import { ClaudeModel, GeminiModel, SupportedModel } from "../types";
import fs from "fs";

const GENERATIONMODELS: SupportedModel[] = [
  "claude-3-5-sonnet-20240620",
  "gpt-4o",
  "gpt-4o-mini",
  "gemini-1.5-pro-002",
  "gemini-1.5-flash-8b",
];

const CRITIQUEMODELS: (ClaudeModel | GeminiModel)[] = [
  "claude-3-5-sonnet-20240620",
  "claude-3-haiku-20240307",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro-002",
];

let runCount = 0;

const batches = [
  {
    data: fs.readFileSync(
      __dirname + "/../../tests/diagen-compiled-code.txt",
      "utf8"
    ),
    desc: "Codebase for diagram generation and visual reflection",
    diagram: "Process flow, external and internal components, and loops",
    tempDir:
      "/Users/hrishioa/Dropbox/Projects/Southbridge/diagen/study/generation-critique/diagen-process",
  },
  {
    data: fs.readFileSync(
      __dirname + "/../../tests/introducing-rakis.mdx",
      "utf8"
    ),
    desc: "Article about a project called Rakis",
    diagram: "Architecture, key components and flow",
    tempDir:
      "/Users/hrishioa/Dropbox/Projects/Southbridge/diagen/study/generation-critique/rakis-blog-architecture",
  },
  {
    data: fs.readFileSync(__dirname + "/../../tests/rag-guide.txt", "utf8"),
    desc: "Article about improving RAG pipelines",
    diagram: "the ideal recommended RAG pipeline with all the complexity",
    tempDir:
      "/Users/hrishioa/Dropbox/Projects/Southbridge/diagen/study/generation-critique/rag-guide",
  },
];

const SELECTEDBATCH = 2;

for (let i = 0; i < GENERATIONMODELS.length; i++) {
  for (let j = 0; j < CRITIQUEMODELS.length; j++) {
    runCount++;

    const tempDir = `${batches[SELECTEDBATCH].tempDir}/${runCount}`;

    if (fs.existsSync(tempDir)) {
      console.log(
        `Skipping run ${runCount} because the directory already exists`
      );
      continue;
    }

    fs.mkdirSync(tempDir, { recursive: true });

    console.log(
      `Running run ${runCount} with generation model ${GENERATIONMODELS[i]} and critique model ${CRITIQUEMODELS[j]}`
    );

    await diagen(
      batches[SELECTEDBATCH].data,
      batches[SELECTEDBATCH].desc,
      batches[SELECTEDBATCH].diagram,
      GENERATIONMODELS[i],
      "claude-3-5-sonnet-20240620",
      CRITIQUEMODELS[j],
      5,
      5,
      true,
      true,
      true,
      tempDir
    );
  }
}
