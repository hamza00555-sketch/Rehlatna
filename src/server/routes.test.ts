// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Route handlers are exercised end to end against the in-memory demo store.
 * The only thing mocked is the cookie jar: each test picks the acting member.
 */
let cookieValue: string | null = null;
let appearanceCookieValue: string | null = null;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === "rj_session" && cookieValue) return { value: cookieValue };
      if (name === "rj_appearance" && appearanceCookieValue) return { value: appearanceCookieValue };
      return undefined;
    },
  }),
}));

import { ensureDemoSeeded } from "@/server/demo";
import { DEMO_HOUSEHOLD_PREGNANCY, DEMO_HOUSEHOLD_POSTPARTUM } from "@/fixtures/demo";
import { readHousehold, writeHousehold } from "@/server/store";
import { readAppearanceCookie, resolveAppearance } from "@/server/session";
import { PATCH as patchSettings } from "@/app/api/household/settings/route";
import { POST as createTask } from "@/app/api/postpartum-tasks/route";
import { PATCH as toggleTask } from "@/app/api/postpartum-tasks/[id]/route";
import { PUT as putFeeding } from "@/app/api/feeding/route";
import { GET as exportHousehold } from "@/app/api/household/export/route";
import { POST as confirmBirth } from "@/app/api/birth/route";
import { POST as createGoal } from "@/app/api/finance/goals/route";
import { POST as createPreparation } from "@/app/api/preparation/route";
import { PATCH as patchMember } from "@/app/api/household/members/[id]/route";

const act = (householdId: string, memberId: string) => {
  cookieValue = JSON.stringify({ householdId, memberId, mode: "demo" });
};
const json = (body: unknown) => new Request("http://app.test/api", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(async () => {
  await ensureDemoSeeded(true);
  cookieValue = null;
  appearanceCookieValue = null;
});

/** Pulls one cookie's decoded value out of a Set-Cookie header, the way a real cookie jar would hand it to the next request. */
function setCookieValue(res: Response, name: string): string | null {
  const header = res.headers.get("set-cookie");
  if (!header) return null;
  const match = header.split(";")[0]?.match(new RegExp(`^${name}=(.*)$`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

describe("session", () => {
  it("rejects requests without a session", async () => {
    const res = await putFeeding(json({ methods: [] }));
    expect(res.status).toBe(401);
  });
});

describe("permissions at the handler", () => {
  it("a family supporter cannot edit care data", async () => {
    act(DEMO_HOUSEHOLD_PREGNANCY, "demo_m_supporter");
    const res = await createTask(json({ kind: "home", title: "x" }));
    expect(res.status).toBe(403);
    expect((await res.json()).permission).toBe("care:edit");
  });

  it("the mother (no finance role) cannot create funding goals", async () => {
    act(DEMO_HOUSEHOLD_PREGNANCY, "demo_m_mother");
    const res = await createGoal(json({ name: "x", expectedCost: 100, fundingDate: "2027-01-01", spendingDate: "2027-02-01", phase: "before_birth", priority: "essential", visibility: "private" }));
    expect(res.status).toBe(403);
  });

  it("the planner can create funding goals", async () => {
    act(DEMO_HOUSEHOLD_PREGNANCY, "demo_m_partner");
    const res = await createGoal(json({ name: "كرسي السيارة", expectedCost: 900, fundingDate: "2027-01-01", spendingDate: "2027-02-01", phase: "before_birth", priority: "essential", visibility: "shared" }));
    expect(res.status).toBe(200);
  });

  it("a member cannot remove household:manage from themselves", async () => {
    act(DEMO_HOUSEHOLD_PREGNANCY, "demo_m_mother");
    const res = await patchMember(new Request("http://app.test", { method: "PATCH", body: JSON.stringify({ permissions: ["journey:view"] }) }), params("demo_m_mother"));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("export honours the finance boundary", () => {
  it("contains no funding data for the mother", async () => {
    act(DEMO_HOUSEHOLD_PREGNANCY, "demo_m_mother");
    const res = await exportHousehold();
    const body = await res.json();
    expect(body.data.fundingGoals).toEqual([]);
    expect(JSON.stringify(body)).not.toContain("expectedCost");
  });

  it("contains funding data for the planner", async () => {
    act(DEMO_HOUSEHOLD_PREGNANCY, "demo_m_partner");
    const body = await (await exportHousehold()).json();
    expect(body.data.fundingGoals.length).toBeGreaterThan(0);
  });
});

describe("feeding preference", () => {
  it("stores any combination, including none, and never invents a method", async () => {
    act(DEMO_HOUSEHOLD_PREGNANCY, "demo_m_mother");
    expect((await putFeeding(json({ methods: [] }))).status).toBe(200);
    let data = await readHousehold("demo", DEMO_HOUSEHOLD_PREGNANCY);
    expect(data!.feedingPreference!.methods).toEqual([]);
    expect((await putFeeding(json({ methods: ["breastfeeding", "pumped"], notes: "  " }))).status).toBe(200);
    data = await readHousehold("demo", DEMO_HOUSEHOLD_PREGNANCY);
    expect(data!.feedingPreference!.methods).toEqual(["breastfeeding", "pumped"]);
    expect(data!.feedingPreference!.notes).toBeUndefined();
  });

  it("rejects unknown methods", async () => {
    act(DEMO_HOUSEHOLD_PREGNANCY, "demo_m_mother");
    expect((await putFeeding(json({ methods: ["juice"] }))).status).toBe(400);
  });
});

describe("postpartum tasks", () => {
  it("creates and toggles a task", async () => {
    act(DEMO_HOUSEHOLD_POSTPARTUM, "demo_m_mother_pp");
    const res = await createTask(json({ kind: "mother_care", title: "قيلولة", dueDate: "" }));
    expect(res.status).toBe(200);
    const { id } = await res.json();
    const toggled = await toggleTask(new Request("http://app.test", { method: "PATCH", body: JSON.stringify({ done: true }) }), params(id));
    expect(toggled.status).toBe(200);
    const data = await readHousehold("demo", DEMO_HOUSEHOLD_POSTPARTUM);
    const task = data!.postpartumTasks.find((t) => t.id === id)!;
    expect(task.done).toBe(true);
    expect(task.dueDate).toBeUndefined();
  });
});

describe("birth confirmation", () => {
  it("requires the explicit confirmed flag", async () => {
    act(DEMO_HOUSEHOLD_PREGNANCY, "demo_m_mother");
    const res = await confirmBirth(json({ birthDate: "2026-09-01", confirmed: false }));
    expect(res.status).toBe(400);
  });

  it("rejects a future birth date", async () => {
    act(DEMO_HOUSEHOLD_PREGNANCY, "demo_m_mother");
    const res = await confirmBirth(json({ birthDate: "2999-01-01", confirmed: true }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("future_birth_date");
  });

  it("refuses a second birth event", async () => {
    act(DEMO_HOUSEHOLD_POSTPARTUM, "demo_m_mother_pp");
    const res = await confirmBirth(json({ birthDate: "2026-09-01", confirmed: true }));
    expect(res.status).toBe(409);
  });

  it("switches to postpartum, seeds tasks and keeps pregnancy records", async () => {
    act(DEMO_HOUSEHOLD_PREGNANCY, "demo_m_mother");
    const before = (await readHousehold("demo", DEMO_HOUSEHOLD_PREGNANCY))!;
    const res = await confirmBirth(json({ birthDate: "2026-09-01", birthTime: "03:15", confirmed: true }));
    expect(res.status).toBe(200);
    const after = (await readHousehold("demo", DEMO_HOUSEHOLD_PREGNANCY))!;
    expect(after.pregnancy!.mode).toBe("postpartum");
    expect(after.baby!.birthDate).toBe("2026-09-01");
    expect(after.postpartumTasks.length).toBeGreaterThan(0);
    expect(after.appointments.length).toBe(before.appointments.length);
    expect(after.ultrasounds.length).toBe(before.ultrasounds.length);
    expect(after.pregnancy!.dueDate).toBe(before.pregnancy!.dueDate);
  });
});

describe("preparation stays money-free", () => {
  it("ignores price-like fields on input", async () => {
    act(DEMO_HOUSEHOLD_PREGNANCY, "demo_m_mother");
    const res = await createPreparation(json({ title: "سرير", category: "sleep", status: "need_to_buy", size: "object", inHospitalBag: false, price: 1200 }));
    expect(res.status).toBe(200);
    const data = await readHousehold("demo", DEMO_HOUSEHOLD_PREGNANCY);
    const item = data!.preparationItems.find((i) => i.title === "سرير")!;
    expect(JSON.stringify(item)).not.toContain("1200");
  });
});

describe("appearance survives a stale store instance", () => {
  // Regression coverage for the demo's per-serverless-instance MemoryStore:
  // a theme/reduceMotion save on one instance must not be lost, and a
  // later partial save (possibly on a different instance, whose copy of
  // household.settings can be stale) must not erase the other field.

  it("resolveAppearance prefers the cookie over a household snapshot that disagrees with it", () => {
    // This is the exact contract RootLayout and the settings page both
    // rely on to agree with each other: whichever store instance answered
    // this request, a saved device preference is not second-guessed.
    const stale = { theme: "light" as const, reduceMotion: false };
    const deviceChoice = { theme: "dark" as const, reduceMotion: true };
    expect(resolveAppearance(stale, deviceChoice)).toEqual(deviceChoice);
    expect(resolveAppearance(stale, null)).toEqual(stale);
  });

  it("does not coerce a malformed reduceMotion (untrusted cookie content) — typeof, not Boolean()", async () => {
    // Boolean("false") is true; a hand-edited or corrupted cookie must not
    // flip reduceMotion on because of that.
    appearanceCookieValue = JSON.stringify({ theme: "dark", reduceMotion: "false" });
    expect(await readAppearanceCookie()).toEqual({ theme: "dark", reduceMotion: false });
  });

  it("a partial save on a stale instance keeps the field it didn't touch", async () => {
    act(DEMO_HOUSEHOLD_PREGNANCY, "demo_m_mother");

    // "Instance A": save theme=dark. Captures the cookie the browser now carries.
    const first = await patchSettings(json({ theme: "dark" }));
    expect(first.status).toBe(200);
    const afterFirst = setCookieValue(first, "rj_appearance");
    expect(JSON.parse(afterFirst!)).toEqual({ theme: "dark", reduceMotion: false });

    // Simulate a different instance's copy of the household never having
    // seen that write (or having reverted some other way) — the bug this
    // guards against reads straight from this stale snapshot instead of
    // from the cookie the browser is actually holding.
    const stale = (await readHousehold("demo", DEMO_HOUSEHOLD_PREGNANCY))!;
    stale.household.settings.theme = "system";
    await writeHousehold("demo", stale);

    // The browser's next request still carries the cookie from the first save.
    appearanceCookieValue = afterFirst;
    const second = await patchSettings(json({ reduceMotion: true }));
    expect(second.status).toBe(200);
    const afterSecond = setCookieValue(second, "rj_appearance");
    expect(JSON.parse(afterSecond!)).toEqual({ theme: "dark", reduceMotion: true });
  });
});
