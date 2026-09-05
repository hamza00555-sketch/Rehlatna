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

  // Preparation / finance / more (placeholders until their phases land)
  { name: "preparation-filled", path: "/preparation", demo: "pregnancy", themes: light },
  { name: "more-hub", path: "/more", demo: "pregnancy", themes: light },
];
