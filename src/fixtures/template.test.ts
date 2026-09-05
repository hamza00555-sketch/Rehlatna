import { describe, expect, it } from "vitest";
import { createHouseholdFromOnboarding } from "./empty";
import { demoHouseholds } from "./demo";
import { weeklyMedia, weeklyMediaInventory } from "@/media/weekly";
import { m } from "@/i18n";

const ids = {
  household: "h",
  users: ["u1", "u2"] as [string, string],
  members: ["m1", "m2"] as [string, string],
  pregnancy: "p",
  baby: "b",
};

describe("template behaviour", () => {
  it("creates a household with a single member, no partner, no name, no gender", () => {
    const data = createHouseholdFromOnboarding(
      {
        dueDate: "2027-03-20",
        creator: { displayName: "أنا", roles: ["mother"] },
        finance: { enabled: false, shared: false },
        followUpCity: "مدينة أ",
        deliveryCity: "مدينة ب",
      },
      ids,
      "2026-09-05T00:00:00.000Z",
    );
    expect(data.members).toHaveLength(1);
    expect(data.baby?.displayName).toBeNull();
    expect(data.baby?.gender).toBe("unknown");
    expect(data.pregnancy?.followUpCity).not.toBe(data.pregnancy?.deliveryCity);
    expect(data.household.settings.financeEnabled).toBe(false);
    expect(data.fundingGoals).toEqual([]);
  });

  it("assigns the financial_planner role to whichever member the family chooses", () => {
    const partnerOwns = createHouseholdFromOnboarding(
      {
        dueDate: "2027-03-20",
        creator: { displayName: "أ", roles: ["mother"] },
        partner: { displayName: "ب", roles: ["partner"] },
        finance: { enabled: true, owner: "partner", shared: false },
        followUpCity: "س",
        deliveryCity: "س",
      },
      ids,
      "2026-09-05T00:00:00.000Z",
    );
    expect(partnerOwns.members[1]?.roles).toContain("financial_planner");
    expect(partnerOwns.members[0]?.roles).not.toContain("financial_planner");

    const creatorOwns = createHouseholdFromOnboarding(
      {
        dueDate: "2027-03-20",
        creator: { displayName: "أ", roles: ["mother"] },
        partner: { displayName: "ب", roles: ["partner"] },
        finance: { enabled: true, owner: "creator", shared: true },
        followUpCity: "س",
        deliveryCity: "س",
      },
      ids,
      "2026-09-05T00:00:00.000Z",
    );
    expect(creatorOwns.members[0]?.roles).toContain("financial_planner");
    expect(creatorOwns.members[0]?.permissions).toContain("finance:view");
    expect(creatorOwns.members[1]?.permissions).not.toContain("finance:view");
  });

  it("neutral baby wording is used when no name exists", () => {
    expect(m.baby.nameOf(null)).toBe("صغيركم");
    expect(m.baby.nameOf("اسم")).toBe("اسم");
  });
});

describe("demo fixtures", () => {
  it("are clearly namespaced and never share ids with live data", () => {
    for (const h of demoHouseholds("2026-09-05")) {
      expect(h.household.id.startsWith("demo_")).toBe(true);
      for (const mm of h.members) expect(mm.id.startsWith("demo_")).toBe(true);
    }
  });

  it("cover both lifecycle states", () => {
    const [preg, post] = demoHouseholds("2026-09-05");
    expect(preg?.pregnancy?.mode).toBe("pregnancy");
    expect(post?.pregnancy?.mode).toBe("postpartum");
    expect(post?.baby?.birthDate).toBeDefined();
  });
});

describe("weekly media manifest", () => {
  it("covers weeks 5–40 with review metadata and no fake production files", () => {
    const inv = weeklyMediaInventory();
    expect(inv.total).toBe(36);
    expect(inv.reviewed).toBe(0);
    expect(inv.withVideo).toBe(0);
    for (let w = 5; w <= 40; w++) {
      const media = weeklyMedia(w);
      expect(media.week).toBe(w);
      expect(media.medicallyReviewed).toBe(false);
      expect(media.developmentSummary.length).toBeGreaterThan(10);
    }
    expect(weeklyMedia(2).week).toBe(5);
    expect(weeklyMedia(44).week).toBe(40);
  });
});
