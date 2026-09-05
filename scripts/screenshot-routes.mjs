// Stable route/state names for the screenshot walker. Each entry names the
// route, the demo state used, and (optionally) an interaction to reach a
// sub-state. Extend per phase; never rename an existing state.
export const ROUTES = [
  { name: "onboarding-welcome", path: "/onboarding", themes: ["light"] },
  { name: "today-pregnancy", path: "/today", demo: "pregnancy" },
  { name: "journey-pregnancy", path: "/journey", demo: "pregnancy", themes: ["light"] },
  { name: "preparation-filled", path: "/preparation", demo: "pregnancy", themes: ["light"] },
  { name: "more-hub", path: "/more", demo: "pregnancy", themes: ["light"] },
];
