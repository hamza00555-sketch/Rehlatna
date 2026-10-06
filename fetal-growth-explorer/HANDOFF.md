# Fetal Growth Explorer — Handoff

> اقرأ هذا الملف أول شي في أي محادثة جديدة. يلخص الرؤية، وش انبنى، وش تعلمنا، ووش الخطوة الجاية.
> Read this first in any new session. Reply to the owner in Arabic (Gulf dialect), short and structured.

---

## 1. الرؤية

**أداة دائمة في بلندر** (Blender production asset) + **عارض ويب تفاعلي**، تعرض نمو الجنين من خلية واحدة (أسبوع ١) إلى الولادة (أسبوع ٤٠).

**في بلندر (الأولوية):**
- رِق (rig) واحد + **سلايدر `week`**: تحركه فيتحول شكل الجنين بنعومة بين كل المراحل.
- الجنين قابل للتحريك (pose / animation) في أي أسبوع.
- أداة نرجع لها دايماً لإنتاج رندرات وفيديوهات ومقاطع.

**على الويب:**
- سلايدر أسابيع، تحوّل ناعم، حركات حيّة، **تفاعل باللمس** (تلمس الجنين فيتحرك).
- يُضمَّن في تطبيقات ومواقع الحمل، يشتغل على الجوال.

**الجودة:** واقعي وفاخر (جلد SSS شبه شفاف، إضاءة سينمائية)، مو كرتوني.

**خارج النطاق:** مطابقة صورة مرجعية واحدة "بالضبط". المرجع للإلهام والاتجاه البصري فقط.

---

## 2. الوضع الحالي

Branch: `claude/fetal-development-weekly-bx99wi`

| الجزء | الحالة |
|---|---|
| بلندر: أسابيع ١٢–٤٠ (جسم + رِق + shape keys) | ✅ جاهز |
| بلندر: سلايدر `week` على `FET_Rig` | ✅ جاهز (`scripts/build_week_rig.py`) |
| بلندر: أسابيع ١–١١ (خلايا / مُضغة) | ❌ غير موجودة في بلندر بعد |
| ويب: أسابيع ١–٥ خلايا (procedural) | ✅ مبسّطة |
| ويب: أسابيع ٦–١٠ مُضغة (procedural, Carnegie) | ✅ مبسّطة |
| ويب: أسابيع ١١–٤٠ جنين مع morph + لمس | ✅ |
| أشكال واقعية بدل الحالية | ⏳ تنتظر أصول (TurboSquid أو AI image-to-3D) |

العارض المنشور: https://claude.ai/artifact/SD57Hj9qnp2aTCq8D4Y5Ux

---

## 3. ملفات المشروع

```
fetal-growth-explorer/
├── blender/
│   ├── fetal_master.blend        # الملف الرئيسي (مو في git — نسخة عند المالك)
│   ├── data/fetal_growth.json    # قياسات الأسابيع ١٢–٤٠ (CRL, CH, وزن, BPD, HC, AC, FL) — base_week 24
│   ├── scripts/
│   │   ├── build_week_keys.py    # shape keys W12..W40 من القياسات (رأس HC/AC، أطراف FL/AC، امتلاء)
│   │   ├── build_week_rig.py     # سلايدر week + real_size + growth (drivers بدون Python)
│   │   ├── fit_silhouette.py     # REF_W24_fit (corrective key لوضعية المرجع) — منتهي
│   │   ├── export_glb.py         # → exports/fetus_W24.glb (morph targets) للويب
│   │   ├── contact_sheet.py      # شيت كل الأسابيع
│   │   └── fge/                  # مكتبة: mhfit (LBS rig), sculpt, camera, lookdev…
│   └── renders/week_slider.jpg   # إثبات السلايدر (٨ أسابيع)
└── web/index.html                # العارض (three.js r147، عربي RTL)
```

### سلايدر بلندر — طريقة العمل
- `FET_Rig` → Object Properties → Custom Properties:
  - `week` (12–40): كل shape key `Wxx` له منحنى خيمة (0 عند الجار، 1 عند أسبوعه).
  - `real_size` (0/1): 1 = الحجم الحقيقي (٨ سم → ٥١ سم)، 0 = حجم ثابت.
  - `growth`: محسوب من جدول CH (driven).
- كله drivers بمنحنيات keyframe (بدون تعابير Python) → يشتغل بدون Auto Run Scripts.
- `week` قابل للكيفريم → أنيميشن نمو بكيفريمين.
- ملاحظة تقنية: منحنيات الـ driver الجديدة في Blender 5 تجي بنقطتين افتراضيتين، لازم `keyframe_points.clear()`. وفي background لازم `update_tag()` + `frame_set()` عشان الدرايفرز تتقيّم.

### ويب — ملاحظات
- GLB مضمّن base64 داخل `<script id="glb-data">` في النسخة المنشورة (artifact ما يقبل .glb). النسخة المنشورة تُبنى بإدخال الـ base64 قبل سطر three.min.js.
- `setWeek(w)`: w<10.5 يخفي الجنين ويعرض خلايا/مُضغة؛ غير كذا morph بين مفاتيح W المتجاورة.

---

## 4. وش تعلمنا (لا تكرر الأخطاء)

1. **لا تنحت أشكال عضوية بالكود.** الوجه والأيدي والأقدام تحتاج أصول جاهزة أو AI-generated أو نحّات. الكود ممتاز للـ rig والـ drivers والخامات والإضاءة والأتمتة وتوحيد الطوبولوجيا.
2. **لا تشتغل أعمى.** استخدم Blender MCP على جهاز المالك مع لقطات شاشة مباشرة.
3. **قِس بالعين مو بالأرقام.** IoU 0.96 ما عنى شي بصرياً.
4. **حدد وقت لكل تجربة.** لو ما نجحت → غيّر الطريقة بدري، واعرض على المالك.

---

## 5. الخطة الجاية

1. **تأكيد Blender MCP يشتغل** — اختبار: وردة مع toon shader + screenshot.
2. **مصدر الأشكال** (نقطة موافقة مع المالك):
   - (أ) مجموعة TurboSquid "3D Fetus 37 Development" (https://www.turbosquid.com/3d-models/3d-fetus-37-development-1329462) — المالك يشتريها ويرفعها FBX. ⚠️ الرخصة القياسية تقيّد الاستخدام القابل للاستخراج على الويب.
   - (ب) Higgsfield `generate_3d` (صورة → GLB) — يصرف رصيد المالك، خذ موافقته.
3. **توحيد الطوبولوجيا:** لف شبكة أساسية واحدة (wrap) على كل موديل أسبوع → نفس عدد النقاط → shape keys على نفس الرِق → نفس سلايدر `week`.
4. **أسابيع ١–١١ في بلندر:** مجسمات منفصلة (خلايا، مُضغة) تظهر/تختفي بنفس `week` (visibility drivers)، وتتبدّل لاحقاً بأصول حقيقية.
5. **Look-dev:** جلد SSS، إضاءة سينمائية.
6. **تصدير للويب:** GLB خفيف للجوال + نفس التفاعل.

---

## 6. إعداد جهاز المالك (Windows)

```powershell
# مرة وحدة
winget install --id Git.Git -e
irm https://claude.ai/install.ps1 | iex
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
claude mcp add --scope user blender -- uvx blender-mcp

# كل مرة
cd $HOME\Rehlatna
git pull
claude
```
- بلندر: إضافة `addon.py` من https://github.com/ahujasid/blender-mcp → تبويب BlenderMCP (N) → Connect.
- `fetal_master.blend` حطه في `fetal-growth-explorer/blender/`.

## 7. قواعد التعامل
- الرد بالعربي، مختصر، منظم، بدون حشو.
- لا تطلب كلمات سر أو توكنات أبداً.
- لا PR إلا بطلب صريح. الكوميت على الفرع أعلاه.
- أي شي يصرف فلوس/رصيد → موافقة أول.
