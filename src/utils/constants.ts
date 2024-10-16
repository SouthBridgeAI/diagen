export const GLOBAL_TEMPERATURE =
  (process.env.GLOBAL_TEMPERATURE &&
    parseInt(process.env.GLOBAL_TEMPERATURE)) ||
  0;

export const TIP20_MODEL = "claude-3-haiku-20240307";
export const tip20Status = {
  disabled: false,
};
