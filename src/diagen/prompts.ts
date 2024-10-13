import { lineTag } from "../utils/helpers";

// prettier-ignore
export const critiquePrompt = (typeofDiagram: string, inputData?: string) =>
(inputData ? `DATA: \n\`\`\`${inputData}\`\`\`\n` : "") +
`Critique the provided ${typeofDiagram}${
  inputData ? " for the DATA" : ""
}, including style, positioning, etc. Provide just the actionable critiques (relevant to the diagram) and ways to improve and simplify, while covering what is useful to keep. Stay within what d2 can do. Stay away from vague criticisms, provide actionable changes, even suggest direct changes to the diagram. Too many disparate unconnected blocks aren't good. Dont' ask to add a legend.`;

// prettier-ignore
export const fixPrompt = (errors: string, diagramCode: string) =>
  `DIAGRAM (with line numbers):
\`\`\`d2
${lineTag(diagramCode)}
\`\`\`

Errors in diagram code:
\`\`\`
${errors}
\`\`\`

Explain why the errors are happening. Then fix the errors in the d2 diagram code provided, and return the fixed code. Keep an eye out for recurring errors and try new fixes.`;

// prettier-ignore
export const generationPrompt = (data: string, dataDesc: string, typeofDiagram: string) =>
`DATA:\n\`\`\`\n${data}\n\`\`\`\n
INSTRUCTION: Data is ${dataDesc}. Generate a landscape (left to right preferred) d2 diagram code (in d2 markdown blocks) for the DATA provided, covering ${typeofDiagram}. 1. Feel free to be creative
2. Provide a single diagram only, with good visual design. 3. Make sure the code is for d2 and not mermaid.
4. Keep it simple when possible. Too many disparate unconnected blocks aren't good.
5. Don't make legends and remove any that exist.`;

// prettier-ignore
export const reflectionPrompt = (typeofDiagram: string, critique: string, diagramCode?: string,inputData?: string) =>
`${inputData ? `DATA: \n\`\`\`${inputData}\`\`\`\n` : ""}${diagramCode? `DIAGRAM: \n\n\`\`\`d2\n${diagramCode}\n\`\`\`\n`: ""}Areas to improve:\n\`\`\`\n${critique}\n\`\`\`
${diagramCode ? `Provided is a d2 ${typeofDiagram} diagram` : 'Here are more suggestions.'}${inputData ? " generated from DATA" : ""}. Apply the critiques when possible to improve the diagram but don't make it too complex. Explain very shortly how you will improve, then generate and return the improved d2 diagram code.`;
