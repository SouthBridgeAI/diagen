<h1 align="center">
  <br>
  <a href="https://github.com/southbridgeai/diagen"><img src="https://github.com/user-attachments/assets/22a14118-d84a-48be-905a-cf7c3294ecac" alt="Diagen" width="200"></a>
  <br>
  <code>npx diagen</code>
  <br>
</h1>

<h3 align="center">Generate beautiful, reflective diagrams from your data with a single command.</h3>

## 🚀 Features

- 🎨 Generate beautiful diagrams from your data
- 🤖 Utilize multiple AI models (OpenAI, Anthropic, Google) for diagram creation and improvement
- 🔄 Automatic diagram refinement through visual reflection and critique
- 📊 Support for various diagram types (flowcharts, architecture diagrams, etc.)
- 🛠 Easy-to-use CLI interface
- 📝 Customizable diagram generation process

## How it works (explained by Diagen)

![9cf49dd0-9961-4adf-b50c-730cad480d5b](https://github.com/user-attachments/assets/4bf2cd9e-1f40-41b0-9b3f-0e6761fda244)


## 🏁 Run as a tool

Set up your API keys as environment variables:

- OpenAI: `OPENAI_API_KEY`
- Anthropic: `ANTHROPIC_API_KEY`
- Google (Gemini): `GEMINI_API_KEY`

Example:

```bash
export OPENAI_API_KEY=your_openai_api_key_here
```

1. Run `diagen` in your terminal:

   ```bash
   npx diagen <source file>
   ```

2. Follow the interactive prompts:

   - Provide a path to your source text file
   - Choose AI models for generation, fixing, and critique
   - Describe your data and desired diagram type
   - Set parameters for diagram refinement

3. diagen will generate, render, and iteratively improve your diagram based on AI feedback.

## Import as a function

```bash
npm install diagen
```

```typescript
import { diagen } from "diagen";

const diagramResults = await diagen(
  data,
  dataDesc,
  diagramDesc,
  generationModel,
  fixModel,
  critiqueModel,
  maxFixSteps,
  maxCritiqueRounds,
  provideFixHistory,
  provideCritiqueHistory,
  provideDataForCritique,
  injectTempDir,
  openDiagrams,
  silent
);
```

## Run from the repository

```bash
git clone https://github.com/southbridgeai/diagen.git
cd diagen
bun install
```

Run diagen directly from bun:

```bash
bun run src/run.ts <source file>
```

## 📋 Prerequisites

- Node.js (v14 or later)
- [d2](https://d2lang.com/tour/install/) (Diagram rendering tool)

## 🎛 Advanced Configuration

When running diagen, you can customize various aspects:

- AI models for different stages (generation, fixing, critique)
- Number of fix attempts and critique rounds
- Whether to use fix and critique history
- Output directory for generated files

## 📊 Supported Diagram Types

diagen can generate various types of diagrams, including but not limited to:

- Flowcharts
- Architecture diagrams
- Entity-relationship diagrams
- Process flow diagrams
- Mind maps

Specify your desired diagram type during the generation process for best results.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [d2](https://d2lang.com/) for diagram rendering
- OpenAI, Anthropic, and Google for their powerful AI models
- All contributors and users of diagen

---

Created with ❤️ by [Hrishi Olickel](https://twitter.com/hrishioa)
