// Stable route/state names for the screenshot walker.
// Run the full walk against a server started WITHOUT Supabase env (the
// onboarding steps use the development session); run `auth` states with it. Each entry names the
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
  // Sign-in gate (renders only when Supabase env is set; otherwise it redirects to /onboarding/start).
  { name: "auth-sign-in", path: "/auth", themes: both },
  {
    name: "auth-code",
    path: "/auth",
    themes: light,
    action: async (page) => {
      if (!page.url().includes("/auth")) return;
      await page.fill("#auth-email", "family@example.com");
      await page.route("**/api/auth/otp", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
      await page.getByRole("button", { name: "أرسلوا رابط الدخول" }).click();
      await page.waitForTimeout(400);
    },
  },
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
  // A just-onboarded family: week ~8, nothing scheduled yet.
  { name: "today-fresh", path: "/today", demo: "fresh", themes: both },
  // Weeks without a development poster fall back to the neutral hero material.
  {
    name: "today-no-poster",
    path: "/today",
    demo: "fresh",
    themes: both,
    fullPage: false,
    action: async (page) => {
      await page.evaluate(() => {
        const hero = document.querySelector('[class*="BabyHero_hero"]');
        if (!hero) return;
        let noMedia = null;
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules) {
              const m = rule.selectorText?.match(/\.(BabyHero_noMedia__[\w-]+)/);
              if (m) noMedia = m[1];
            }
          } catch {}
        }
        hero.querySelectorAll("img, video").forEach((el) => el.remove());
        if (noMedia) hero.classList.add(noMedia);
      });
      await page.waitForTimeout(300);
    },
  },
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

  // More: family, care, planning, settings
  { name: "more-hub", path: "/more", demo: "pregnancy", themes: both },
  { name: "more-hub-postpartum", path: "/more", demo: "postpartum", themes: light },
  { name: "mother-profile", path: "/more/family/demo_m_mother", demo: "pregnancy", themes: light },
  { name: "partner-profile", path: "/more/family/demo_m_partner", demo: "pregnancy", member: "demo_m_partner", themes: light },
  { name: "baby-profile", path: "/more/baby", demo: "pregnancy", themes: light },
  { name: "baby-profile-born", path: "/more/baby", demo: "postpartum", themes: light },
  { name: "permissions", path: "/more/permissions", demo: "pregnancy", member: "demo_m_partner", themes: light },
  { name: "care-providers", path: "/more/providers", demo: "pregnancy", themes: both },
  { name: "care-providers-empty", path: "/more/providers", demo: "fresh", themes: light },
  { name: "provider-new-doctor", path: "/more/providers/new?kind=doctor", demo: "pregnancy", themes: light },
  { name: "doctor-detail", path: "/more/providers/doctor/demo_dr1", demo: "pregnancy", themes: light },
  { name: "hospital-detail", path: "/more/providers/hospital/demo_h2", demo: "pregnancy", themes: light },
  { name: "insurance-detail", path: "/more/providers/insurance/demo_ins1", demo: "pregnancy", themes: both },
  { name: "travel-plan", path: "/more/travel", demo: "pregnancy", themes: light },
  { name: "birth-plan", path: "/more/birth-plan", demo: "pregnancy", themes: both },
  { name: "settings-privacy", path: "/more/settings", demo: "pregnancy", themes: both },

  // Postpartum chapter
  { name: "postpartum-journey", path: "/journey/postpartum", demo: "postpartum", themes: both },
  { name: "feeding-preferences", path: "/more/feeding", demo: "postpartum", themes: light },
  { name: "feeding-unset", path: "/more/feeding", demo: "pregnancy", themes: light },
  {
    name: "postpartum-task-toggle",
    path: "/journey/postpartum",
    demo: "postpartum",
    themes: light,
    action: async (page) => {
      await page.getByRole("checkbox", { name: /الرضاعة/ }).first().click();
      await page.waitForTimeout(600);
    },
  },

  // Birth transition
  { name: "birth-event-form", path: "/journey/birth", demo: "pregnancy", themes: both },
  { name: "birth-confirmation", path: "/journey/birth/confirmed", demo: "postpartum", themes: light },

  // Error states
  { name: "not-found", path: "/journey/appointments/does-not-exist", demo: "pregnancy", themes: light },
  {
    name: "offline-notice",
    path: "/today",
    demo: "pregnancy",
    themes: light,
    fullPage: false,
    action: async (page) => {
      await page.context().setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event("offline")));
      await page.waitForTimeout(400);
    },
  },
];
