# Master Build Prompt — Pregnancy, Birth & Postpartum Journey App

> Product brief — the behavioural source of truth. Where this brief and
> `design-system.md` conflict, the brief governs behaviour, privacy,
> calculations and permissions; the design system governs visual execution.

You are acting as a senior product designer, staff-level frontend engineer, backend architect, and accessibility reviewer.

Build a production-ready Arabic-first application for pregnancy tracking, birth preparation, and the first three postpartum months.

The attached design-system file is the approved design system. Read that file completely before designing or implementing anything.

Do not begin by generating generic UI. First inspect:

1. The attached design-system file.
2. The existing repository and its current stack.
3. Existing routes, components, assets, data models, tests, and configuration.
4. Any screenshots or visual references included with the design system.

Then provide a concise implementation plan and begin building in coherent phases.

## 1. Product vision

This is not a conventional pregnancy tracker, a medical portal, a baby-themed app, or a financial dashboard.

The central promise is:

> "I open the app to see my baby, and I leave knowing where we are, what we need to do, and what comes next."

The product combines:

- Weekly pregnancy progress.
- Baby development.
- Appointments, checkups, and ultrasounds.
- A continuous journey from pregnancy through birth and postpartum.
- Preparation inventory.
- Shared family tasks.
- Delivery planning.
- Different follow-up and delivery cities.
- Doctor, hospital, and insurance records.
- Travel preparation.
- Hospital bag and birth plan.
- The forty-day postpartum period.
- The baby's first three months.
- An optional private financial-planning layer.

The three product pillars are:

1. A living, emotionally powerful Baby Hero.
2. A clear continuous journey.
3. Calm planning without clutter.

The application must feel: warm, intimate, refined, alive, calm, premium, personal after setup, mature enough for both parents.

It must never feel: childish, overly feminine, corporate, like a spreadsheet, like a hospital portal, like a finance app with a pregnancy skin, like a collection of identical cards, like a generic pastel baby application.

## 2. Template requirement

This application is a reusable product template for different families. It must not be hardcoded around one real family.

Do not hardcode personal examples such as: Hamza, Asma, Noor, Salman, a specific doctor, a specific hospital, a specific insurance company, Riyadh, Makkah, March 2027, fixed pregnancy weeks, prices, dates, or family relationships.

All personalized content must come from data. Examples:

```ts
family.mother.displayName
family.partner.displayName
pregnancy.currentWeek
pregnancy.currentDay
pregnancy.dueDate
pregnancy.followUpCity
pregnancy.deliveryCity
baby.displayName
baby.gender
finance.ownerUserId
```

If no baby name exists, use a natural neutral term such as: صغيركم، البيبي، موعد الوصول.

Never expose placeholder keys in the interface.

The working product name must also be configurable. Do not tightly couple components to "رحلتنا" or any final brand name.

## 3. Design-system authority

The attached design-system file is the visual source of truth. It defines semantic colors, typography, type sizes and weights, spacing, radius, borders, shadows, components, component variants and states, motion rules, image direction, RTL rules, accessibility rules, privacy rules, and approved visual references.

Required behavior:

- Use semantic tokens rather than raw values.
- Do not invent new colors, spacing values, radii, shadows, or type sizes.
- Do not subtly adjust approved values.
- Every component must match the states defined in the design system.
- If an exact component does not exist, compose it from existing primitives.
- If composition is impossible, use the nearest approved value and record the limitation.
- Do not silently expand the system.

If the product brief and design-system file conflict:

- The product brief governs behavior, privacy, calculations, and permissions.
- The design-system file governs visual execution.
- Report the conflict before making an irreversible decision.

Personal names, dates, cities, prices, or providers visible in design-system screenshots are sample content only. They are not part of the reusable system.

Generated screenshots are composition references, not production source files. Rebuild their interfaces using real components and real text.

## 4. Image and media system

Images are a first-class part of the product, not decorative afterthoughts.

Create a typed media model containing at least:

```ts
type MediaAsset = {
  id: string;
  family:
    | "weekly-baby"
    | "preparation-object"
    | "family-story"
    | "care"
    | "travel"
    | "birth"
    | "postpartum"
    | "user-upload";
  src: string;
  posterSrc?: string;
  mimeType: string;
  alt: string;
  focalPoint?: { x: number; y: number };
  crop?: "portrait" | "hero" | "card" | "full-bleed";
  safeArea?: { top?: number; right?: number; bottom?: number; left?: number };
  week?: number;
  medicallyReviewed?: boolean;
  reviewNotes?: string;
  reducedMotionSrc?: string;
  loadingFallback?: string;
  errorFallback?: string;
};
```

### Weekly baby media

Weeks 5–40 must belong to one visual universe: consistent lighting, materials, lens and framing language, quality; medically plausible pregnancy stage; no mature fetus shown for an early week; never presented as diagnostic imagery; every weekly asset requires medical review metadata before production.

Only load the current week initially. Prefetch adjacent weeks only on suitable connections.

If video is unavailable: show the approved poster; keep the week and development information visible; never collapse or remove the Hero.

### Postpartum media

After birth: prefer a photo supplied by the family; if none, use neutral material, light, textile, or domestic imagery; never generate a replacement baby that could be mistaken for the user's actual child.

### Preparation imagery

Product photography must share one warm neutral studio environment, consistent shadow direction, crop, object scale and background treatment. Do not use mixed e-commerce photography.

### Missing assets

Do not draw custom SVG illustrations, fake embryo artwork, or use emoji as placeholders.

If required assets are absent: build the complete media component and fallback states; use a restrained neutral placeholder; produce an asset backlog containing filename, purpose, ratio, crop, safe area, and medical-review requirement; do not pretend the missing production asset exists.

## 5. Roles and privacy

Do not assume the father is always the financial owner.

```ts
type HouseholdRole = "mother" | "partner" | "financial_planner" | "family_supporter";
```

A user may have more than one role.

The household setup must determine: who is following the pregnancy; who shares the journey; who manages financial planning; whether financial planning is private or shared; what each member may view or edit.

```ts
type Permission =
  | "journey:view" | "journey:edit"
  | "appointments:view" | "appointments:edit"
  | "preparation:view" | "preparation:edit"
  | "care:view" | "care:edit"
  | "finance:view" | "finance:edit"
  | "household:manage";
```

Financial privacy must be enforced before serialization.

Never: send private finance fields to an unauthorized client; fetch private totals and hide them with CSS; display blurred private amounts; include financial data in shared analytics events; leak prices through preparation payloads.

Shared members may see: an item is needed / owned / undecided / not required.

Only authorized finance members may see: price, amount saved, remaining amount, funding date, spending date, monthly requirement, contributions, allocation.

## 6. Pregnancy lifecycle

```ts
type JourneyMode = "setup" | "pregnancy" | "birth_transition" | "postpartum";
```

**Pregnancy mode** shows: current week; current day within the week; approximate remaining time; baby visual; general development information; next meaningful action; upcoming appointment or milestone; preparation readiness.

**Birth transition** — an explicit event: **وصل صغيرنا**. Collect: birth date; birth time (optional); baby name; gender (if the family wishes); optional family photo after confirmation. Confirmation must be explicit. Do not trigger the transition automatically from the due date.

**Postpartum mode** — after confirmation: replace pregnancy week with baby age; start with days, then weeks and months; keep the complete pregnancy journey accessible; continue tasks and milestones; support the forty-day period; support the first three months; do not treat birth as the end of the product.

## 7. Gender and baby name

Initially `baby.gender = "unknown"; baby.displayName = null;`

Gender recording is optional. Options: boy, girl, later, prefer not to record.

The selection may adjust contextual accents, progress, selected states, limited visual highlights. It must not recolor the entire canvas, all cards, primary navigation, or primary actions. Do not use stereotypes.

When a baby name is added, use it gently where it improves emotional connection. Do not repeat it in every title.

## 8. Navigation

Primary navigation contains exactly: **اليوم · الرحلة · التجهيز · المزيد**.

Do not create permanent top-level tabs for doctors, hospitals, insurance, baby, calendar, tasks, or finance. Those features live inside their relevant context.

Finance appears only to authorized members, inside More or a contextual Today Bento, never as a visible shared tab.

## 9. Today experience

Today must not look like a dashboard. Its order is:

1. Baby Hero.
2. One contextual next action.
3. An asymmetric Bento composition.
4. Bottom navigation.

Possible Bento modules: next appointment; current journey point; preparation readiness; what is happening this week; authorized private financial summary; upcoming travel or birth-plan action.

Bento sizes: 1×1, 2×1, 1×2, 2×2, full width, hero. The layout may adapt to priority (an ultrasound tomorrow becomes more prominent; nothing urgent → Baby Hero gets more space; finance never dominates; avoid grids where every card has identical dimensions).

The first viewport must remain short and understandable within seconds.

## 10. Baby Hero

Baby Hero is the signature product experience. It must include: current pregnancy week or postpartum age; day within the current week when pregnant; remaining approximate time; short development statement; premium image or silent video; loading, error, poster-only, and reduced-motion states.

Interaction: pressing it expands the same container to full screen with a shared-element transition; media playback continues without restarting; no generic centered modal; controls stay away from the baby focal point; extended details in an attached bottom sheet; never autoplay audio.

Reduced motion: replace spatial expansion with a 120ms opacity transition; use the poster; preserve the same information hierarchy.

## 11. Journey

The journey is a continuous narrative, not a calendar.

```ts
type MilestoneType =
  | "automatic" | "manual" | "medical" | "family" | "financial"
  | "travel" | "preparation" | "birth" | "postpartum";
```

Typical milestones: pregnancy setup; first appointment; first ultrasound; end of first trimester; beginning of second trimester; optional gender moment; optional name moment; hospital decision; travel preparation; hospital bag; expected due window; birth; family celebration; forty-day period; return home; first month; second month; third month.

Rules: highlight exactly one current point; quiet past and future milestones; show relative timing for the next milestone; allow automatic and manual milestones; preserve pregnancy history after birth; avoid rendering a dense calendar.

## 12. Appointments, doctors, hospitals, and insurance

**Appointments** support: type, date, time, doctor, hospital or clinic, city, notes, preparation tasks, status, optional reminder.

**Doctors** — multiple providers: pregnancy follow-up doctor, delivery doctor, specialist, backup provider.

**Hospitals** support: name, city, follow-up / delivery / emergency purpose, contact, location, notes, insurance-coverage belief, last verification date.

**Insurance** supports: provider, plan or class, coverage notes, candidate hospitals, last verification date, verification task.

Never say coverage is guaranteed. Use wording such as: يعتقد أنه مشمول · يحتاج تحقق · آخر تحقق · غير مؤكد.

Follow-up city and delivery city are independent fields throughout the product.

## 13. Preparation system

Do not build one long checklist.

```ts
type PreparationStatus = "owned" | "need_to_buy" | "not_required" | "undecided";
```

Suggested categories: sleep, mobility, feeding, clothing, care, hospital, travel, mother's postpartum needs, other.

Use image-led cards for major physical items; compact task rows for smaller actions and consumables; asymmetric Bento composition where useful; empty and populated states.

If an item becomes `need_to_buy`, authorized finance members may receive: **هل تضيفه للخطة المالية؟**

Shared preparation data must remain usable without exposing financial fields.

## 14. Financial planning

Finance is optional and permission-protected. Do not impose an arbitrary budget.

```ts
type FundingGoal = {
  id: string;
  householdId: string;
  name: string;
  expectedCost?: number;
  actualCost?: number;
  fundedAmount: number;
  fundingDate: string;
  spendingDate?: string;
  phase: "before_birth" | "at_birth" | "after_birth";
  priority: "essential" | "important" | "optional";
  notes?: string;
  preparationItemId?: string;
  visibility: "private" | "shared";
  ownerUserId: string;
};
```

**The most important rule: funding date is not spending date.** All savings calculations use `fundingDate`. `spendingDate` is descriptive and remains separate.

```ts
targetCost = actualCost ?? expectedCost ?? 0
remaining = Math.max(targetCost - fundedAmount, 0)
```

Monthly requirement must be based on the remaining contribution periods until the funding date. Document the exact date-boundary behavior and test: funding date today; this month; next month; in the past; goal already fully funded; price increase; price decrease; new contribution; new goal; deleted goal.

Every recalculation must explain: what changed; why the monthly requirement changed; previous amount; new amount; effective funding date.

Never change a target price, a funding date, a contribution, or an allocation without explicit confirmation.

Keep financial visuals calm: one primary progress bar; amounts beside percentages; no unnecessary charts; no repeated KPI dashboard.

## 15. Feeding support

Support direct breastfeeding; pumped and stored milk; formula only when chosen by the family or medically needed; flexible combinations; editable preferences. Never assume every family uses formula. Do not diagnose feeding problems or shame any feeding decision.

## 16. Medical boundaries

The application offers general editable information, planning support, appointment organization, care coordination, user-entered records.

It must not diagnose, predict medical outcomes, replace a doctor, present generated fetal imagery as diagnostic, claim insurance coverage, or give emergency reassurance.

Where relevant, provide a concise boundary statement and encourage appropriate professional care without filling every screen with disclaimers.

## 17. RTL and Arabic requirements

Arabic is the primary interface language.

- True RTL layout; do not blindly mirror every icon — back, next, progress, timeline and directional icons reviewed individually.
- Latin numbers, dates, percentages, measurements and currency units in isolated bidirectional runs; tabular numerals where alignment matters.
- Arabic labels must not break awkwardly; labels outside inputs; placeholders never the only label.
- Arabic and English data entry without corrupting direction.
- Localization architected so English can be added later without rebuilding components.

Copy must be warm, brief, clear, mature, non-clinical unless medically necessary, free from exaggerated sentiment and childish language.

## 18. Accessibility

WCAG AA contrast for essential normal text; 44×44 CSS-pixel targets; visible keyboard focus; screen-reader labels for icon-only buttons; semantic headings; proper form labels and errors; no state through color alone; reduced-motion support; poster fallbacks for video; accessible modal/sheet focus handling; correct announcement when calculations or status change. Test both light and dark modes.

## 19. Motion

Soft, fluid, confident, continuous. Use motion for Baby Hero expansion, Bento-to-detail expansion, journey movement, progress updates, contextual gender-accent transition, pregnancy-to-postpartum transition.

Do not use bounce, confetti, cute elastic movement, constant decorative animation, multiple competing ambient effects. A screen may have no more than two living visual effects; Baby Hero counts as one.

## 20. Recommended route inventory

**Onboarding** — welcome; due date; household and role setup; privacy and financial access; follow-up and delivery cities; initial family setup.

**Today** — pregnancy Today; Baby Hero expanded; weekly development; loading and media error; postpartum Today.

**Journey** — pregnancy journey; milestone detail; appointment detail; create/edit appointment; ultrasound record; gender choice; baby name; birth transition; forty-day journey; first three months.

**Preparation** — empty; filled; category detail; owned item; needed item; undecided item; hospital bag; add/edit item; finance handoff for authorized users.

**Private finance** — overview; goal detail; add/edit goal; contribution history; recalculation confirmation; empty state; unauthorized state.

**More** — family profiles; mother profile; baby profile; household permissions; care providers; doctor detail; hospital detail; insurance detail; travel plan; birth plan; settings; privacy; notifications; reduced motion; offline/error recovery.

Do not force every destination into permanent navigation.

## 21. Data architecture

Normalized, typed model for at least: User, Household, HouseholdMember, Role and Permission, Pregnancy, Baby, JourneyMilestone, Appointment, UltrasoundRecord, CareProvider, Hospital, InsuranceRecord, VerificationTask, PreparationCategory, PreparationItem, FundingGoal, FundingContribution, TravelPlan, BirthPlan, PostpartumTask, MediaAsset, NotificationPreference.

Separate domain models, API payloads, permission-filtered serializers, UI view models, demo fixtures. Never use UI state as the privacy boundary.

## 22. Demo data

A completely separate demo fixture: generic fictional data only; no real family names; no real insurance assumptions; no production dependency on demo data; easy reset; easy switch between empty and populated demonstrations; clearly marked as demo in development.

The real application must start from a respectful empty/setup state. Generic does not mean visually empty — demo mode should show the full emotional and visual potential without contaminating production defaults.

## 23. Technical approach

If the repository is empty: propose the smallest production-suitable architecture; TypeScript; strong runtime validation at API boundaries; server-only private data separated from client payloads; design tokens in one source of truth; no duplicated token values across CSS and components.

Generate from the design-system file: semantic CSS variables; typed token access; component variants; development documentation; visual-regression references.

Do not install a generic UI kit and let it dictate the product's appearance. A library may provide accessibility primitives, but the final rendering must follow the design system exactly.

## 24. Implementation phases

- **Phase 0 — Audit**: repository, design system, assets, routes/components, privacy risks, contradictions, route and data plan.
- **Phase 1 — Foundation**: tokens, typography, RTL, theme, core primitives, navigation, data models, permission model, demo fixtures, accessibility baseline.
- **Phase 2 — Core pregnancy journey**: onboarding, Today, Baby Hero, expanded Hero, weekly development, journey, appointments, ultrasound, gender and name moments.
- **Phase 3 — Preparation and finance**: preparation states, categories and item details, shared/private serialization, financial goals, funding-date calculations, recalculation explanations.
- **Phase 4 — Care, travel, and birth**: family profiles, doctors, hospitals, insurance verification, cross-city travel, birth plan, hospital bag, birth transition.
- **Phase 5 — Postpartum**: postpartum Today, feeding preferences, forty-day journey, first three months, pregnancy history continuity.
- **Phase 6 — Quality**: unit, integration and permission tests; accessibility; RTL QA; responsive QA; visual regression; error and offline states; performance audit.

Keep commits and pull requests coherent.

## 25. Required tests

**Privacy** — unauthorized members never receive financial fields; shared preparation remains visible without its financial relation; role changes correctly update access; API serialization enforces permissions.

**Finance** — funding date differs from spending date; monthly requirement recalculates correctly; fully funded goals return zero remaining; price changes produce an explanation; no goal changes without confirmation.

**Journey** — exactly one current milestone; pregnancy history remains after birth; birth requires explicit confirmation; postpartum age calculates correctly.

**Template behavior** — works with no personal names, without gender, without a baby name; follow-up and delivery cities can differ; empty and populated states render; demo fixtures never appear in production data.

**Visual system** — no unauthorized raw colors or spacing values; core components include all required states; light and dark follow the system; reduced motion replaces spatial transitions; every essential control meets target size and contrast.

## 26. Screenshot and route QA

Run the application and walk every route. Capture every meaningful page and state: empty, filled, loading, error, unauthorized, modal/sheet open, pregnancy, postpartum, light, dark where meaningfully different. Do not capture only attractive screens.

For each screenshot: stable route/state name; route; demo state used; comparison against the design-system references; fix visual drift before calling the phase complete. If the application cannot run, report the blocker. Never invent successful screenshots.

## 27. Non-negotiable product rules

- Baby Hero appears before planning information on Today.
- The app is an assistant, not a dashboard. The first view remains short.
- Primary navigation has exactly four destinations.
- Finance is permission-protected and never a shared tab.
- Financial calculations use funding date; spending date remains separate.
- One journey point is current. Birth continues the journey instead of ending it.
- No diagnosis. No guaranteed insurance coverage. No assumption of formula feeding.
- Follow-up and delivery cities are independent.
- No emoji as product icons. No unmodified mixed icon libraries in production.
- No generic generated baby illustrations. No heavy black Arabic typography. No childish rounded fonts.
- No generic same-size card grid. No silent design-system deviations. No hardcoded personal family data.

## 28. Definition of done

- Design system implemented as the visual source of truth.
- No hardcoded real-family details. Empty and demo experiences separated.
- A new family can complete onboarding and obtain a personalized experience.
- Pregnancy, preparation, birth and postpartum form one continuous journey.
- Private financial data protected on the server and serialization layers.
- Every important interaction has loading, error, focus, pressed and disabled handling.
- RTL, accessibility, reduced motion and mixed-number formatting verified.
- Every implemented route has a current screenshot. Tests pass.
- Missing media and unresolved approximations listed explicitly.
- No feature described as complete unless actually run and verified.

---

# Signature Weekly Baby Video System

The baby shown in the application is not a static illustration and must not be treated as decorative hero artwork. It is the product's signature living experience.

## Weekly progression

Media-driven system covering every gestational week from **week 5 through week 40** — 36 distinct weekly media sets, one per week. The active media changes automatically when `pregnancy.currentWeek` changes. The day within the week affects text and progress but must not fake a medically inaccurate visual transformation. Do not reuse one mature fetus video and resize it; do not create growth by scaling the same model; do not interpolate or morph between medically different stages unless the transition has been medically reviewed.

```ts
type WeeklyBabyMedia = {
  week: number;
  videoMp4?: string;
  videoWebm?: string;
  posterWebp: string;
  thumbnailWebp?: string;
  alt: string;
  developmentSummary: string;
  approximateSize?: string;
  approximateWeight?: string;
  focalPoint: { x: number; y: number };
  safeArea: { top: number; right: number; bottom: number; left: number };
  loopDurationSeconds?: number;
  medicallyReviewed: boolean;
  reviewedAt?: string;
  reviewNotes?: string;
};
```

## Video behavior

Seamless, silent video loop: ~5–8 seconds; no visible first/last-frame cut; no audio; no autoplay sound controls; subtle continuous movement appropriate to the stage; no exaggerated kicking, breathing or eye movement; no camera shake; no cute animation language; no floating particles (no outer-space feel); no dramatic glow obscuring anatomy; no diagnostic overlays.

MP4 + WebM for delivery, WebP for the poster. No GIF. Alive when observed for several seconds, calm enough for the top of Today.

## Visual continuity

One coherent universe: same cinematic lighting philosophy; same rose, amber, ivory and warm-shadow treatment; same material and rendering quality; controlled evolution in camera distance as the baby grows; consistent background depth, highlight softness, color grading, focal-point logic and text-safe areas. Week 8 → week 9 should feel like continuing the same journey.

## Medical-stage accuracy

Early weeks show an embryo with early-stage proportions; limb, facial, body and movement development match the stage; a mature newborn-like fetus never appears in an early week; beauty never overrides stage accuracy.

Every weekly visual is `medicallyReviewed: false` until a qualified medical reviewer approves it. Unreviewed media may be used in development and internal previews only.

## Loading strategy

On Today: load the current week's poster immediately; begin loading the current week's video; replace poster with video only when playback is ready; keep week text visible while loading; prefetch only previous and next week on suitable connections; never download all 36 videos at launch.

Respect Reduced Data mode, slow connections, offline state, failed requests, battery-conscious playback, page visibility. Pause when the Hero is fully outside the viewport, the app is in the background, or the OS requests reduced resource usage. Resume without resetting playback unnecessarily.

## Hero expansion continuity

Expand the existing Hero into full-screen BabyHeroExpanded; preserve the same video element where technically possible; preserve the playback timestamp; do not restart; do not flash the poster; no generic modal; no second competing video.

The expanded screen adds week and day, approximate size, approximate weight when appropriate, what is developing, what changed this week, general non-diagnostic information, close and share controls, an attached bottom information sheet. The media remains the focal point.

## Reduced motion

Do not autoplay the loop; use the weekly poster; replace shared spatial expansion with a 120ms opacity transition; preserve all information and actions; do not remove Baby Hero.

## Error fallback

If video fails: keep the poster, week number and development information; show a quiet retry control if useful; never replace the Hero with an empty card, collapse its height or show a broken-media icon. If both video and poster fail, use the approved neutral weekly-media fallback.

## Pregnancy date changes

If the due date is edited and `currentWeek` changes: recalculate the active weekly media; explain that the displayed week changed because the expected due date changed; do not alter stored appointments or user-created milestones silently; preserve the previous value in change history.

## Postpartum transition

After birth is confirmed: stop using weekly fetus media as the primary Today Hero; preserve all weekly media inside pregnancy journey history; prefer the family's own baby photo or video; neutral material-and-light fallback otherwise; never generate a fictional replacement baby.

## Missing production videos

If the 36 production loops are not attached: do not invent final medical baby videos; do not substitute unrelated stock footage; implement the complete media architecture with posters and explicit development placeholders; create an asset manifest for weeks 5–40; mark each missing loop clearly; keep the product functional with poster fallbacks; report the missing media inventory before calling Baby Hero complete.

Baby Hero is not complete merely because a static image appears. Completion requires the weekly media mapping, video lifecycle, poster fallback, expansion continuity, reduced-motion behavior and medical-review state to be implemented and tested.
