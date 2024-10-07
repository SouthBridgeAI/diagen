import { exec } from "child_process";
import path from "path";
import fs from "fs";

interface RenderResult {
  success: boolean;
  err?: string;
  filename?: string;
  executionTime: number;
}

export async function render(
  diagramLocation: string,
  diagramId: string,
  tempDir: string,
  saveLogStep?: (step: any) => void,
  timeoutMs: number = 20000
): Promise<RenderResult> {
  const diagramsDir = path.join(tempDir, "diagrams");
  if (!fs.existsSync(diagramsDir)) {
    fs.mkdirSync(diagramsDir, { recursive: true });
  }

  const outputPath = path.join(diagramsDir, `${diagramId}.png`);
  const d2Command = `d2 --theme=300 -l dagre ${diagramLocation} ${outputPath}`;

  return new Promise<RenderResult>((resolve) => {
    const startTime = Date.now();
    const process = exec(d2Command, (err, stdout, stderr) => {
      const executionTime = Date.now() - startTime;
      if (err || !stderr.includes("success")) {
        const result: RenderResult = {
          success: false,
          err: stderr || err?.message,
          executionTime,
        };
        if (saveLogStep) {
          saveLogStep({
            type: "render_error",
            diagramId,
            diagramLocation,
            err: result.err,
            stderr,
            stdout,
            executionTime,
          });
        }
        resolve(result);
      } else {
        const result: RenderResult = {
          success: true,
          filename: outputPath,
          executionTime,
        };
        if (saveLogStep) {
          saveLogStep({
            type: "render_success",
            diagramId,
            outputPath,
            diagramLocation,
            executionTime,
          });
        }
        resolve(result);
      }
    });

    setTimeout(() => {
      process.kill();
      const result: RenderResult = {
        success: false,
        err: "Render process timed out",
        executionTime: timeoutMs,
      };
      if (saveLogStep) {
        saveLogStep({
          type: "render_timeout",
          diagramId,
          diagramLocation,
          executionTime: timeoutMs,
        });
      }
      resolve(result);
    }, timeoutMs);
  });
}
