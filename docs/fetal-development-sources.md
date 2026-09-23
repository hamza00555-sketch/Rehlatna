# Fetal development — sources

Research behind `src/media/weekly.ts` (weeks 0–40, gestational age from the
first day of the last menstrual period). Text is simplified general
information; every week lists the sources it draws from, and the app shows them
as links on the weekly page.

## Sources used

| Short name | Source | Used for |
| --- | --- | --- |
| NHS | [Week-by-week guide to pregnancy](https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/) (weeks 4–41, one page per week) | development facts, lengths |
| Cleveland Clinic | [Fetal Development: Week-by-Week Stages](https://my.clevelandclinic.org/health/articles/7247-fetal-development-stages-of-growth) | development facts, viability |
| MedlinePlus (NIH) | [Fetal development](https://medlineplus.gov/ency/article/002398.htm) | weeks 1–3, embryonic period |
| ACOG | [How your fetus grows during pregnancy](https://www.acog.org/womens-health/faqs/how-your-fetus-grows-during-pregnancy), [Committee Opinion 579: Definition of term pregnancy](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2013/11/definition-of-term-pregnancy) | trimesters, term definitions, due date |
| WHO | [Fetal growth charts](https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1002220) (Kiserud et al., PLoS Med 2017), Table 11 | weights, weeks 14–40 (50th percentile EFW) |
| INTERGROWTH-21st | [CRL standard](https://europepmc.org/article/PMC/PMC4286014) (Papageorghiou et al., UOG 2014) | cross-check of lengths, weeks 9–13 |

Mayo Clinic's week-by-week articles were not reachable (403) and are not cited.

## Numbers

- **Length**: NHS figures. Crown–rump ("head to bottom") through week 19,
  crown–heel from week 20 — hence the jump from 15.3 cm to 25.6 cm. INTERGROWTH
  means agree for weeks 9–13 (21.9, 32.6, 43.8, 55.6, 67.8 mm).
- **Weight**: WHO 50th-percentile estimated fetal weight, both sexes, rounded.
  None before week 14.
- **Size comparisons**: only where NHS gives them (poppy seed, sesame seed, pea).

## Where sources disagree (and what the app says)

1. Embryo → fetus: CC after week 8, NHS "around" 8, MedlinePlus 10. App: "around week 8, sources vary 8–10".
2. Term: NHS calls 37–38 "full term"; ACOG splits early term 37+0–38+6, full term 39+0–40+6, late term 41, postterm 42. App follows ACOG.
3. Trimesters: NHS second trimester from 13; ACOG from 14+0. App follows ACOG (`trimesterOfWeek`).
4. Viability: CC after week 23, NHS week 24. App marks week 24.
5. Anomaly scan: NHS gives both 18–20 and 18–21 weeks. App says 18–21.
6. Eyes opening: NHS 26, CC 27, MedlinePlus ~28. App: "may open for the first time" at 26, blinking at 27.
7. Brain "fully developed" (NHS 33) contradicts CC/ACOG; the app does not repeat that claim.
8. First movements: NHS 18–24, CC 19, MedlinePlus 19–21.

## Review

All entries stay `medicallyReviewed: false` until a clinician signs off.

## Images

`public/media/weekly/week-NN.{poster,thumb}.webp`, credited in
`src/media/sourcedImages.ts` and under the image on the weekly page. All are
real files from Wikimedia Commons under Public domain, CC0, CC BY or CC BY-SA
(no NC/ND), from named origins — none are generated:

- Weeks 0, 1, 4: OpenStax *Anatomy & Physiology* diagrams (CC BY). Week 40: Blausen Medical (CC BY 3.0).
- Weeks 2–3: real micrographs of a human oocyte (ZEISS Microscopy) and a day-1 zygote.
- Weeks 6–10: pathologists' photographs of real embryos (Ed Uthman MD; "lunar caustic"), from ectopic pregnancies or miscarriage. Graphic tissue is visible.
- Weeks 5, 11–39: clinicians' ultrasound scans with the gestational age on screen (Wolfgang Moroder, Nevit Dilmen, X. Compagnion, others).

Reused or nearest-week images (the caption states the true age): 15 (16w1d),
31 (30w2d), 37 (36w2d), 38 (39w0d). Posters are letterboxed to 4:5, never
cropped, except week 32, whose scanner header was cropped to remove a patient
name. Modified CC BY-SA images remain under CC BY-SA.
