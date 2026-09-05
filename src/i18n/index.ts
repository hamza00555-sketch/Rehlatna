import { ar, ageWord, count, days, months, unitFor, weeks } from "./ar";

/**
 * Single active catalogue. To add English: create `en.ts` with the same
 * shape and select by locale here — components never import a catalogue
 * directly.
 */
export const m = ar;
export { ageWord, count, days, months, unitFor, weeks };
export type { Messages } from "./ar";
