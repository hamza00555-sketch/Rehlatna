import type { WeeklyImageCredit } from "@/domain/types";

export interface SourcedImage {
  poster: string;
  thumb: string;
  focalPoint?: { x: number; y: number };
  credit: WeeklyImageCredit;
}

/** Openly licensed weekly images (filled from the sourcing manifest). */
export const SOURCED_IMAGES: Record<number, SourcedImage> = {};
