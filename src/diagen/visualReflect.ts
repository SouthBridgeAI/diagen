import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import path from "path";
import ora from "ora";
import { resizeAndSaveImage } from "../utils/resize";
import { ClaudeModel } from "../types";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import { ImageBlockParam, TextBlockParam } from "@anthropic-ai/sdk/resources";

const critiquePrompt = (typeofDiagram: string, inputData?: string) =>
  (inputData ? `DATA: \n\`\`\`${inputData}\`\`\`\n` : "") +
  `Critique the provided ${typeofDiagram}${
    inputData ? " for the DATA" : ""
  }, including style, positioning, etc. Provide just the actionable critiques (relevant to the diagram)and ways to improve, while covering what is useful to keep. Stay within what d2 can do. Stay away from vague criticisms, provide actionable changes, even suggest direct changes to the diagram. Dont' ask to add a legend.`;

export async function visualReflect(
  diagramLocation: string,
  modelName: string,
  typeofDiagram: string,
  inputData?: string,
  retries: number = 1
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in the environment variables");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const fileManager = new GoogleAIFileManager(apiKey);

  const resizedImage = await resizeAndSaveImage(diagramLocation, 3072, 3072);

  const uploadSpinner = ora("Uploading diagram").start();

  // Upload the file
  const uploadResult = await fileManager.uploadFile(resizedImage, {
    displayName: path.basename(resizedImage),
    mimeType: "image/png",
  });

  uploadSpinner.succeed(`Diagram uploaded as ${uploadResult.file.uri}`);

  const model = genAI.getGenerativeModel({ model: modelName });

  const generationConfig = {
    temperature: 0.2,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  };

  const spinner = ora("Getting feedback on diagram").start();
  try {
    const chatSession = model.startChat({
      generationConfig,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    const result = await chatSession.sendMessage([
      critiquePrompt(typeofDiagram, inputData),
      {
        fileData: {
          mimeType: uploadResult.file.mimeType,
          fileUri: uploadResult.file.uri,
        },
      },
    ]);

    spinner.succeed("Got feedback on diagram");

    return result.response.text();
  } catch (err) {
    console.error(err);

    spinner.fail(`Failed to get feedback on diagram, retries - ${retries}`);

    if (retries == 1) throw err;
    return await visualReflect(
      diagramLocation,
      modelName,
      typeofDiagram,
      inputData,
      retries - 1
    );
  }
}

export async function visualReflectWithClaude(
  diagramLocation: string,
  modelName: ClaudeModel,
  typeofDiagram: string,
  inputData?: string,
  retries: number = 1
): Promise<string> {
  const client = new Anthropic();

  const resizedImage = await resizeAndSaveImage(diagramLocation, 1092, 1092);

  const imageData = fs.readFileSync(resizedImage, { encoding: "base64" });

  const messageContent: (TextBlockParam | ImageBlockParam)[] = [
    {
      type: "text",
      text: critiquePrompt(typeofDiagram, inputData),
    },
  ];

  messageContent.push({
    type: "image",
    source: {
      type: "base64",
      data: imageData,
      media_type: "image/png",
    },
  });

  const spinner = ora(`Getting feedback on diagram from ${modelName}`).start();

  try {
    const response = await client.messages.create({
      model: modelName,
      max_tokens: 4096,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: messageContent,
        },
      ],
    });

    spinner.succeed("Got feedback on diagram");

    return response.content
      .filter((content) => content.type === "text")
      .map((c) => c.text)
      .join("\n");
  } catch (err) {
    console.error(err);

    spinner.fail(`Failed to get feedback on diagram, retries - ${retries}`);

    if (retries == 1) throw err;
    return await visualReflect(
      diagramLocation,
      modelName,
      typeofDiagram,
      inputData,
      retries - 1
    );
  }
}
