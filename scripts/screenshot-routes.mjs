// Stable route/state names for the screenshot walker. Each entry names the
// route, the demo state used, and (optionally) an interaction to reach a
// sub-state. Extend per phase; never rename an existing state.
//
// Demo member ids (see src/fixtures/demo.ts):
//   demo_m_mother (mother, no finance) · demo_m_partner (partner + planner)
//   demo_m_supporter (family supporter)

const both = ["light", "dark"];
const light = ["light"];

export const ROUTES = [
  // Onboarding
  { name: "onboarding-welcome", path: "/onboarding", themes: light },
  { name: "onboarding-story", path: "/onboarding/start", themes: light },
  {
    name: "onboarding-due-date",
    path: "/onboarding/start",
    themes: light,
    action: async (page) => {
      await page.getByRole("button", { name: "متابعة" }).click();
      await page.waitForTimeout(200);
    },
  },
  {
    name: "onboarding-household",
    path: "/onboarding/start",
    themes: light,
    action: async (page) => {
      await page.getByRole("button", { name: "متابعة" }).click();
      const day = page.locator("button[aria-pressed]").nth(20);
      await day.click();
      await page.getByRole("button", { name: "متابعة" }).click();
      await page.waitForTimeout(200);
    },
  },

  // Today
  { name: "today-pregnancy", path: "/today", demo: "pregnancy", themes: both },
  {
    name: "baby-hero-expanded",
    path: "/today",
    demo: "pregnancy",
    themes: light,
    fullPage: false,
    action: async (page) => {
      await page.locator("button[aria-label^='تطور الأسبوع']").click();
      await page.waitForTimeout(600);
    },
  },
  { name: "today-reduced-motion", path: "/today", demo: "pregnancy", themes: light, reducedMotion: true, fullPage: false },
  { name: "weekly-development", path: "/today/week", demo: "pregnancy", themes: both },
  { name: "today-postpartum", path: "/today", demo: "postpartum", themes: both },

  // Journey
  { name: "journey-pregnancy", path: "/journey", demo: "pregnancy", themes: both },
  { name: "journey-postpartum", path: "/journey", demo: "postpartum", themes: light },
  { name: "appointment-detail", path: "/journey/appointments/demo_a3", demo: "pregnancy", themes: light },
  { name: "appointment-create", path: "/journey/appointments/new", demo: "pregnancy", themes: light },
  { name: "milestone-detail", path: "/journey/milestone/demo_ms_hospital", demo: "pregnancy", themes: light },
  { name: "ultrasound-record", path: "/journey/ultrasound/demo_us1", demo: "pregnancy", themes: light },
  { name: "gender-choice", path: "/journey/gender", demo: "pregnancy", themes: light },
  { name: "baby-name", path: "/journey/name", demo: "pregnancy", themes: light },

  // Preparation
  { name: "preparation-empty", path: "/preparation", demo: "fresh", themes: light },
  { name: "preparation-filled", path: "/preparation", demo: "pregnancy", themes: both },
  { name: "preparation-needed-filter", path: "/preparation?status=needed", demo: "pregnancy", themes: light },
  { name: "preparation-sleep", path: "/preparation/sleep", demo: "pregnancy", themes: light },
  { name: "preparation-item-owned", path: "/preparation/item/demo_pi_stroller", demo: "pregnancy", themes: light },
  { name: "preparation-item-needed-shared", path: "/preparation/item/demo_pi_clothes", demo: "pregnancy", themes: light },
  { name: "preparation-item-needed-planner", path: "/preparation/item/demo_pi_clothes", demo: "pregnancy", member: "demo_m_partner", themes: light },
  {
    name: "preparation-finance-prompt",
    path: "/preparation/item/demo_pi_clothes",
    demo: "pregnancy",
    member: "demo_m_partner",
    themes: light,
    fullPage: false,
    action: async (page) => {
      await page.getByRole("button", { name: "نعم، أضفه" }).click();
      await page.waitForTimeout(500);
    },
  },
  { name: "preparation-item-undecided", path: "/preparation/item/demo_pi_bassinet", demo: "pregnancy", themes: light },
  { name: "preparation-item-edit", path: "/preparation/item/demo_pi_bassinet/edit", demo: "pregnancy", themes: light },
  { name: "hospital-bag", path: "/preparation/hospital-bag", demo: "pregnancy", themes: light },

  // Private finance
  { name: "finance-unauthorized", path: "/finance", demo: "pregnancy", themes: light },
  { name: "finance-overview", path: "/finance", demo: "pregnancy", member: "demo_m_partner", themes: both },
  { name: "finance-empty", path: "/finance", demo: "fresh", member: "demo_m_fresh_partner", themes: light },
  { name: "funding-goal-detail", path: "/finance/goals/demo_g_carseat", demo: "pregnancy", member: "demo_m_partner", themes: light },
  { name: "funding-goal-complete", path: "/finance/goals/demo_g_hospital", demo: "pregnancy", member: "demo_m_partner", themes: light },
  { name: "expense-editor", path: "/finance/goals/demo_g_carseat/edit", demo: "pregnancy", member: "demo_m_partner", themes: light },
  {
    name: "finance-recalculation-confirm",
    path: "/finance/goals/demo_g_carseat/edit",
    demo: "pregnancy",
    member: "demo_m_partner",
    themes: light,
    fullPage: false,
    action: async (page) => {
      await page.fill("#goal-expected", "1600");
      await page.getByRole("button", { name: "تطبيق التغيير" }).click();
      await page.waitForTimeout(500);
    },
  },

  // More (placeholder until Phase 4)
  { name: "more-hub", path: "/more", demo: "pregnancy", themes: light },
];
