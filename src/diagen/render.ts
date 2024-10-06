import { exec } from "child_process";
import path from "path";

export async function render(
  diagramLocation: string,
  id: string,
  saveLogStep?: (step: any) => void
) {
  const outputPath = `${path.dirname(diagramLocation)}/diagram-${id}.png`;
  const d2Command = `d2 --theme=300 -l dagre ${diagramLocation} ${outputPath}`;
  return new Promise<{ err?: string; filename: string }>((resolve) => {
    exec(d2Command, (err, stdout, stderr) => {
      if (err || !stderr.includes("success")) {
        if (saveLogStep)
          saveLogStep({
            type: "render_error",
            diagramLocation,
            err,
            stderr,
            stdout,
          });
        resolve({ err: stderr, filename: outputPath });
      } else {
        if (saveLogStep)
          saveLogStep({
            type: "render_success",
            outputPath,
            diagramId: id,
            diagramLocation,
          });
        resolve({ err: undefined, filename: outputPath });
      }
    });
  });
}
