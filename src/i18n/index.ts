import { ar, count, days, months, weeks } from "./ar";

/**
 * Single active catalogue. To add English: create `en.ts` with the same
 * shape and select by locale here — components never import a catalogue
 * directly.
 */
export const m = ar;
export { count, days, months, weeks };
export type { Messages } from "./ar";
