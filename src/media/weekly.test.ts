import { describe, expect, it } from "vitest";
import { WEEKLY_MEDIA, weeklyMedia } from "./weekly";
import { SOURCED_IMAGES } from "./sourcedImages";

describe("weekly development manifest", () => {
  it("covers every gestational week from 0 to 40 in order", () => {
    expect([...WEEKLY_MEDIA.keys()].sort((a, b) => a - b)).toEqual(Array.from({ length: 41 }, (_, i) => i));
  });

  it("cites at least one published https source for every week", () => {
    for (const media of WEEKLY_MEDIA.values()) {
      expect(media.sources.length, `week ${media.week}`).toBeGreaterThan(0);
      for (const s of media.sources) expect(s.url, `week ${media.week}`).toMatch(/^https:\/\//);
    }
  });

  it("has no size or weight before an embryo exists", () => {
    for (const w of [0, 1, 2, 3]) {
      expect(weeklyMedia(w).approximateSize).toBeUndefined();
      expect(weeklyMedia(w).approximateWeight).toBeUndefined();
    }
  });

  it("clamps out-of-range weeks", () => {
    expect(weeklyMedia(-2).week).toBe(0);
    expect(weeklyMedia(43).week).toBe(40);
  });

  it("credits every image with author, license and source page", () => {
    for (const [week, img] of Object.entries(SOURCED_IMAGES)) {
      expect(img.credit.author, `week ${week}`).toBeTruthy();
      expect(img.credit.license, `week ${week}`).toMatch(/^(CC BY|CC0|Public domain)/i);
      expect(img.credit.sourceUrl, `week ${week}`).toMatch(/^https:\/\//);
    }
  });
});
