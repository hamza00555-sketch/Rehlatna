# Care reference — low-risk pregnancy

Source of the recommended care windows surfaced in Today, the weekly page and
the journey. Guidance for organising follow-up, never a schedule the app
enforces; the doctor may move, add or drop any of it. Everything below keys off
the single gestational-age source (`pregnancyProgress` from the due date).

| Key | Weeks | Kind | Counts as done when | Surfaces |
| --- | --- | --- | --- | --- |
| first_visit | 4–12 | visit | any appointment in range | Today next step, week |
| nipt | 10–22 | decision (optional) | recorded as discussed / skipped | week only |
| early_scan | 11–14 | scan | ultrasound in range | timeline, Today, week |
| visit_18 | 17–19 (±1) | visit | any appointment | Today, week |
| anatomy_scan | 18–22 | scan | ultrasound in range | timeline, Today, week |
| visit_24 | 23–25 (±1) | visit | any appointment | Today, week |
| gdm_screen | 24–28 | screening | lab in range | timeline, Today, week |
| visit_28 | 27–29 (±1) | visit | any appointment | Today, week |
| tdap | 27–36 | vaccine | recorded as discussed | timeline, Today, week |
| anti_d | 28–30 | conditional on Rh negative | checkup / recorded | Today, week (only when Rh− is set) |
| visit_32 | 31–33 (±1) | visit | any appointment | Today, week |
| visit_36 | 35–37 (±1) | visit | any appointment | Today, week |
| gbs_screen | 36–37 | screening | lab in range | timeline, Today, week |
| visit_38 | 37–39 (±1) | visit | any appointment | Today, week |
| visit_40 | 39–41 (±1) | visit | any appointment | Today, week |

States: `upcoming` → `active` → `scheduled` / `done` → `needs_attention`
(closed within the last 4 weeks, nothing recorded) → `passed`. Optional windows
never reach `needs_attention`. Families can record `done`, `discussed` or
`skipped` on any window; a recorded value wins over inference.

Today's next-step slot picks, in order: appointment within 3 days with open
tasks → open care window (nothing scheduled) → recently closed window not
recorded → no upcoming appointments → birth plan without a hospital at 36+ →
gender at 18+ → empty preparation → hospital bag at 34+ → travel at 28+.

Danger signs are never tied to a week: a row on Today and on the weekly page
opens the list with the line "بعض الأعراض تحتاج تقييماً طبياً دون انتظار الموعد القادم".
The disclaimer "رحلتنا يساعدك على تنظيم متابعة الحمل، لكنه لا يستبدل نصيحة الطبيب"
sits under every window and on the weekly page.

Language rules: never "يجب", "ضروري لكل حامل" or "متأخرة". Always "عادةً",
"يمكنك مناقشة", "لم تسجّلي … بعد", "قد يوصي الطبيب", "حسب حالتك".

Personalisation hooks: `requires` on a window gates it on a recorded fact
(today only `rhNegative`). Twin, high-risk, GDM or hypertension pathways plug
in as further facts or alternative tables in `src/domain/careWindows.ts`; the
app never assumes them.
