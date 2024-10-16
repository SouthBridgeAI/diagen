#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { select, input, confirm } from "@inquirer/prompts";
import { ClaudeModel, GeminiModel, SupportedModel } from "./types";
import { diagen } from "./diagen";
import { checkModelAuthExists, isCommandAvailable } from "./utils/helpers";
import { countTokens } from "@anthropic-ai/tokenizer";
import { TIP20_MODEL, tip20Status } from "./utils/constants";

async function runWizard() {
  // Print the version of diagen
  if (process.env.npm_package_version !== undefined)
    console.log(`diagen v${process.env.npm_package_version}`);

  // Check for command line arguments
  const [, , sourceFile, outputDir] = process.argv;

  if (!checkModelAuthExists(TIP20_MODEL, true)) {
    const continueWithoutTip20 = await confirm({
      message:
        "If you don't have an Anthropic API key, tip20 (https://github.com/SouthBridgeAI/tip20) will not work. Your diagrams might still be fine, but it's a cheap easy way to ensure they are. Do you want to continue without tip20?",
      default: true,
    });

    if (!continueWithoutTip20) {
      console.log("Please add an anthropic api key and restart.");
      process.exit(0);
    } else {
      tip20Status.disabled = true;
    }
  }

  if (!sourceFile) {
    console.log(
      "Please provide a path to the source text file as an argument."
    );
    process.exit(1);
  }

  // Read the source file
  let data: string;
  try {
    data = fs.readFileSync(sourceFile, "utf-8");
  } catch (error) {
    console.error(`Error reading source file: ${(error as Error).message}`);
    process.exit(1);
  }

  if (countTokens(data) > 100 * 1000) {
    console.error(
      "The source file is larger than 100k tokens. Do you want to continue? This may cause errors."
    );
    const continueAnyway = await confirm({
      message: "Continue anyway?",
      default: true,
    });
    if (!continueAnyway) {
      console.log("See you when you've fixed it!");
      process.exit(1);
    }
  }

  // Check if d2 is available
  const d2IsAvailable = await isCommandAvailable("d2");

  if (!d2IsAvailable) {
    console.log(
      'd2 is not available on your system. Please install it from https://d2lang.com/tour/install/ (Or carefully run "curl -fsSL https://d2lang.com/install.sh | sh -s --")'
    );
    process.exit(1);
  }

  const saneModelDefaults = {
    anthropic: {
      generationModel: "claude-3-5-sonnet-20240620",
      fixModel: "claude-3-5-sonnet-20240620",
      critiqueModel: "claude-3-haiku-20240307",
    },
    openai: {
      generationModel: "gpt-4o",
      fixModel: "gpt-4o",
      critiqueModel: "gemini-1.5-flash-8b",
    },
    google: {
      generationModel: "gemini-1.5-pro-002",
      fixModel: "gemini-1.5-pro-002",
      critiqueModel: "gemini-1.5-flash-8b",
    },
  };

  // Ask if they want sane defaults and skip advanced config? Let them select a single provider or select advanced config
  const saneDefaultChoice = await select({
    message: "Do you want to use recommended defaults with a single provider?",
    choices: [
      { name: "Anthropic (Recommended)", value: "anthropic" },
      { name: "Google", value: "google" },
      { name: "OpenAI and Gemini", value: "openai" },
      { name: "Let me select my own", value: "custom" },
    ],
  });

  const modelChoices: {
    name: string;
    value: SupportedModel;
  }[] = [
    { name: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet-20240620" },
    { name: "Claude 3.5 Haiku", value: "claude-3-haiku-20240307" },
    { name: "GPT-4o", value: "gpt-4o" },
    { name: "GPT-4o-mini", value: "gpt-4o-mini" },
    { name: "Gemini 1.5 Pro", value: "gemini-1.5-pro-002" },
    { name: "Gemini 1.5 Flash", value: "gemini-1.5-flash-8b" },
  ];

  const generationModel: SupportedModel =
    saneDefaultChoice in saneModelDefaults
      ? saneModelDefaults[saneDefaultChoice].generationModel
      : await select({
          message: "Select the model to use for diagram generation:",
          choices: modelChoices,
        });

  if (!checkModelAuthExists(generationModel)) {
    process.exit(1);
  }

  const fixModel: SupportedModel =
    saneDefaultChoice in saneModelDefaults
      ? saneModelDefaults[saneDefaultChoice].fixModel
      : await select({
          message: "Select the model to use for fixing diagram errors:",
          choices: modelChoices,
        });

  if (!checkModelAuthExists(fixModel)) {
    process.exit(1);
  }

  const critiqueModel: ClaudeModel | GeminiModel =
    saneDefaultChoice in saneModelDefaults
      ? saneModelDefaults[saneDefaultChoice].critiqueModel
      : await select({
          message: "Select the model to use for visual reflection:",
          choices: [
            { name: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet-20240620" },
            { name: "Claude 3.5 Haiku", value: "claude-3-haiku-20240307" },
            { name: "Gemini 1.5 Pro", value: "gemini-1.5-pro-002" },
            { name: "Gemini 1.5 Flash", value: "gemini-1.5-flash-8b" },
          ],
        });

  if (!checkModelAuthExists(critiqueModel)) {
    process.exit(1);
  }

  // Wizard for selecting parameters
  const dataDesc = await input({
    message: "Enter a brief description of the data:",
  });

  const diagramDesc = await input({
    message: "Enter a description of the diagram you want to generate:",
  });

  const maxFixSteps =
    saneDefaultChoice !== "custom"
      ? 4
      : await input({
          message:
            "How many times should we try to fix a broken diagram? (recommended: 4):",
          default: "4",
          validate: (value) => !isNaN(Number(value)) || "Please enter a number",
        });

  const maxCritiqueRounds =
    saneDefaultChoice !== "custom"
      ? 4
      : await input({
          message:
            "How many times should we try to improve diagrams? (default: 4):",
          default: "4",
          validate: (value) => !isNaN(Number(value)) || "Please enter a number",
        });

  const provideFixHistory =
    saneDefaultChoice !== "custom"
      ? true
      : await confirm({
          message: "Allow the AI to remember previous fix attempts?",
          default: true,
        });

  const provideCritiqueHistory =
    saneDefaultChoice !== "custom"
      ? true
      : await confirm({
          message: "Allow the AI to remember previous critique attempts?",
          default: true,
        });

  const provideDataForCritique =
    saneDefaultChoice !== "custom"
      ? true
      : await confirm({
          message:
            "Allow the model to use the source data for critiques? (Increases cost but improves results)",
          default: true,
        });

  let outputDirectory = outputDir;

  if (!outputDirectory) {
    outputDirectory = await input({
      message:
        "Please provide a directory to save the diagrams and code to (leave empty for a diagen directory in the current folder): ",
    });

    if (!outputDirectory) {
      outputDirectory = path.join(
        process.cwd(),
        `diagen_${new Date().toISOString().replace(/[^0-9]/g, "")}`
      );
    }
  }

  console.log("Saving outputs to ", outputDirectory);

  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  // Run diagen
  const result = await diagen(
    data,
    dataDesc,
    diagramDesc,
    generationModel,
    fixModel,
    critiqueModel,
    Number(maxFixSteps),
    Number(maxCritiqueRounds),
    provideFixHistory,
    provideCritiqueHistory,
    provideDataForCritique,
    outputDirectory,
    true,
    false
  );

  console.log("Completed. Results saved to", outputDirectory);
  console.log(
    "Diagen is still in alpha. \n\nNext step is a GUI and adding pdf and multiple doc imports. \n\nTo follow development, please leave a star at https://github.com/southbridgeai/diagen :)"
  );

  process.exit(0);
}

runWizard();
