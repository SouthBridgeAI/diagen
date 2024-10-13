export const GLOBAL_TEMPERATURE =
  (process.env.GLOBAL_TEMPERATURE &&
    parseInt(process.env.GLOBAL_TEMPERATURE)) ||
  0;
