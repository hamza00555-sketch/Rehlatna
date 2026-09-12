// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createHouseholdFromOnboarding } from "./empty";

const ids = { household: "h", users: ["u1", "u2"] as [string, string], members: ["m1", "m2"] as [string, string], pregnancy: "p", baby: "b" };

describe("template-first household", () => {
  it("is built entirely from onboarding input", () => {
    const data = createHouseholdFromOnboarding(
      {
        dating: { datingMethod: "clinician", dueDate: "2027-05-10" },
        creator: { displayName: "أ", roles: ["mother"] },
        partner: { displayName: "ب", roles: ["partner"] },
        finance: { enabled: true, owner: "partner", shared: false },
        followUpCity: "مدينة 1",
        deliveryCity: "مدينة 2",
      },
      { dueDate: "2027-05-10", datingMethod: "clinician" },
      ids,
      "2026-09-05T00:00:00.000Z",
    );
    expect(data.members.map((mm) => mm.displayName)).toEqual(["أ", "ب"]);
    expect(data.pregnancy!.followUpCity).toBe("مدينة 1");
    expect(data.pregnancy!.deliveryCity).toBe("مدينة 2");
    expect(data.members[1]!.roles).toContain("financial_planner");
    expect(data.members[0]!.roles).not.toContain("financial_planner");
    expect(data.appointments).toEqual([]);
    expect(data.fundingGoals).toEqual([]);
    expect(data.preparationItems).toEqual([]);
    expect(data.careProviders).toEqual([]);
    expect(data.baby!.gender).toBe("unknown");
    expect(data.baby!.displayName).toBeNull();
  });

  it("gives the creator the finance role when they own it", () => {
    const data = createHouseholdFromOnboarding(
      {
        dating: { datingMethod: "clinician", dueDate: "2027-05-10" },
        creator: { displayName: "أ", roles: ["partner"] },
        finance: { enabled: true, owner: "creator", shared: true },
        followUpCity: "x",
        deliveryCity: "x",
      },
      { dueDate: "2027-05-10", datingMethod: "clinician" },
      ids,
      "2026-09-05T00:00:00.000Z",
    );
    expect(data.members[0]!.roles).toContain("financial_planner");
    expect(data.household.settings.financeShared).toBe(true);
  });
});

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|css|mjs)$/.test(entry) && !entry.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

describe("source hygiene", () => {
  const files = walk(join(process.cwd(), "src"));

  it("contains no hardcoded real-family data", () => {
    const forbidden = ["Hamza", "حمزة", "Asma", "سلمان", "Salman", "Riyadh", "Makkah", "2027-03-"];
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      for (const word of forbidden) expect(text, `${f} contains ${word}`).not.toContain(word);
    }
  });

  it("uses no emoji anywhere in the product", () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    for (const f of files) expect(emoji.test(readFileSync(f, "utf8")), `${f} contains emoji`).toBe(false);
  });

  it("weekly media is never marked medically reviewed without a reviewer", async () => {
    const { WEEKLY_MEDIA } = await import("@/media/weekly");
    for (const media of WEEKLY_MEDIA.values()) {
      if (media.medicallyReviewed) expect(media.reviewedAt, `week ${media.week}`).toBeTruthy();
    }
  });
});
