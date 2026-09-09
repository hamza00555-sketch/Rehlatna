# Care reference — low-risk pregnancy

Source of the recommended care windows surfaced in Today, the weekly page and
the journey. Guidance for organising follow-up, never a schedule the app
enforces; the doctor may move, add or drop any of it. Everything below keys off
the single gestational-age source (`pregnancyProgress` from the due date).

| Key | Weeks | Kind | Scheduled by | Done when | Surfaces |
| --- | --- | --- | --- | --- | --- |
| first_visit | 4–12 | visit | any appointment in range | any completed contact, or recorded | Today next step, week |
| nipt | 10–22 | decision (optional) | lab in range | recorded (discussed is its own state) | week only |
| early_scan | 11–14 | scan | ultrasound in range | linked appointment done, or recorded | timeline, Today, week |
| visit_18 | 17–19 (±1) | visit | any appointment | any completed contact, or recorded | Today, week |
| anatomy_scan | 18–22 | scan | ultrasound in range | linked appointment done, or recorded | timeline, Today, week |
| visit_24 | 23–25 (±1) | visit | any appointment | any completed contact, or recorded | Today, week |
| gdm_screen | 24–28 | screening | lab in range | linked appointment done, or recorded | timeline, Today, week |
| visit_28 | 27–29 (±1) | visit | any appointment | any completed contact, or recorded | Today, week |
| tdap | 27–36 | vaccine | — | recorded (discussed is its own state) | timeline, Today, week |
| anti_d | 28–30 | conditional on Rh negative | checkup in range | linked appointment done, or recorded | Today, week (only when Rh− is set) |
| visit_32 | 31–33 (±1) | visit | any appointment | any completed contact, or recorded | Today, week |
| visit_36 | 35–37 (±1) | visit | any appointment | any completed contact, or recorded | Today, week |
| gbs_screen | 36–37 | screening | lab in range | linked appointment done, or recorded | timeline, Today, week |
| visit_38 | 37–39 (±1) | visit | any appointment | any completed contact, or recorded | Today, week |
| visit_40 | 39–41 (±1) | visit | any appointment | any completed contact, or recorded | Today, week |

Matching rule. An appointment booked from a window's own "add appointment"
carries `careWindowKey` and belongs to that window only (never borrowed by
another scan, screening or decision, whatever its date; visits still count it,
because any contact with the care team is the point). Without that link, an appointment of a fitting
type inside the window (visits: ±1 week) counts as **scheduled**; once it is
completed it completes a **visit** (any contact with the care team is the
point) but for scans, screenings and decisions it stays a candidate: the
window shows "you have an appointment of this kind in the same period — if it
was this, record it" and the family confirms. The app never infers that a
specific test happened from a generic appointment.

States: `upcoming` → `active` → `scheduled` / `discussed` / `done` →
`needs_attention` (closed within the last 4 weeks, nothing recorded) →
`passed`. `discussed` (decisions and vaccines) means the topic was raised with
the doctor, not that it was carried out; it never claims the next-step slot
and can still be marked done. Optional windows never reach `needs_attention`.
Families can record `done`, `discussed` or `skipped` on any window; a recorded
value wins over inference.

Trimesters follow one rule everywhere (`trimesterOfWeek`): completed weeks
0–13 → first, 14–27 → second, 28+ → third. The "end of first trimester"
milestone sits on the last day of week 13; "third trimester begins" on the
first day of week 28. Weeks 0–4 show a neutral entry (no borrowed week-5
media, no size), and length figures state what they measure (crown–rump before
week 20, crown–heel after).

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
