import "dotenv/config";
import reflectOnDiagram from "../src/diagen/visualReflect";

(async () => {
  // console.log("Trying the smaller image:");
  // await reflectOnDiagram(
  //   "/Users/hrishioa/Dropbox/Projects/Southbridge/diagen/.diagen/20241006160142741/diagram-initial_diagram_fixed_0_resized.png",
  //   "gemini-1.5-pro-exp-0827",
  //   "information flow"
  // );

  console.log("Trying the larger image:");
  const critique = await reflectOnDiagram(
    "/Users/hrishioa/Dropbox/Projects/Southbridge/diagen/.diagen/20241006160846212/diagram-initial_diagram_fixed_1.png",
    "gemini-1.5-pro-exp-0827",
    "information flow"
  );

  console.log("Got critique: ", critique);
})();
