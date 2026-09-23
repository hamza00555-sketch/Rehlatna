import type { WeeklyBabyMedia, WeeklySourceRef } from "@/domain/types";
import { MEDIA_MAX_WEEK, MEDIA_MIN_WEEK } from "@/domain/pregnancy";
import { SOURCED_IMAGES } from "./sourcedImages";

/**
 * Weekly development manifest — gestational weeks 0 through 40, counted from
 * the first day of the last menstrual period.
 *
 * Every line of text is drawn from the published sources listed on its week
 * (docs/fetal-development-sources.md records the research, the growth
 * references and where sources disagree). Lengths are the NHS week-by-week
 * figures (crown–rump to week 19, crown–heel from week 20, as NHS switches);
 * weights are the WHO fetal growth charts' 50th percentile estimated fetal
 * weight (Kiserud et al., PLoS Med 2017), which begin at week 14. Images are
 * openly licensed files from trusted sources with attribution (sourcedImages.ts).
 *
 * General information for families, not diagnostic and not personalised;
 * `medicallyReviewed` stays false until a clinician signs off.
 */

const S = {
  cc: { label: "Cleveland Clinic", url: "https://my.clevelandclinic.org/health/articles/7247-fetal-development-stages-of-growth" },
  medline: { label: "MedlinePlus (NIH)", url: "https://medlineplus.gov/ency/article/002398.htm" },
  acog: { label: "ACOG", url: "https://www.acog.org/womens-health/faqs/how-your-fetus-grows-during-pregnancy" },
  acogTerm: { label: "ACOG — تعريف اكتمال الحمل", url: "https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2013/11/definition-of-term-pregnancy" },
  who: { label: "WHO Fetal Growth Charts", url: "https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1002220" },
  ig21: { label: "INTERGROWTH-21st (CRL)", url: "https://europepmc.org/article/PMC/PMC4286014" },
  nhsGuide: { label: "NHS", url: "https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/" },
} satisfies Record<string, WeeklySourceRef>;

type SourceKey = keyof typeof S | "nhs";

function nhsWeek(week: number): WeeklySourceRef {
  const tri = week <= 12 ? "1st-trimester" : week <= 27 ? "2nd-trimester" : "3rd-trimester";
  return { label: "NHS", url: `https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/${tri}/week-${week}/` };
}

interface WeekSeed {
  size?: string;
  like?: string;
  weight?: string;
  summary: string;
  points: string[];
  milestone?: string;
  src: SourceKey[];
}

const SEED: Record<number, WeekSeed> = {
  0: {
    summary: "الأسبوع صفر هو أول يوم في آخر دورة شهرية. من هنا يبدأ حساب الحمل، مع أنه لا يوجد حمل بعد.",
    points: ["يُحسب الحمل نحو 40 أسبوعاً من أول يوم في آخر دورة", "يُفترض أن الحمل يبدأ بعد نحو أسبوعين من هذا التاريخ", "لذلك أول أسبوعين محسوبين يسبقان الإخصاب"],
    src: ["acog", "medline"],
  },
  1: {
    summary: "أسبوع الدورة الشهرية. الجسم يبدأ دورة جديدة، ولا يوجد حمل بعد.",
    points: ["الأسبوع الأول يبدأ من اليوم الأول للدورة", "المرأة ليست حاملاً بعد في هذا الأسبوع", "يستعد الجسم لإطلاق بويضة جديدة"],
    src: ["medline", "acog"],
  },
  2: {
    summary: "أسبوع الإباضة: تنطلق البويضة من المبيض، وقد يحدث الإخصاب في نهايته.",
    points: ["تحدث الإباضة خلال الأسبوع الثاني", "تنتقل البويضة إلى قناة فالوب", "لا يوجد حمل حتى يتم الإخصاب"],
    src: ["medline", "acog"],
  },
  3: {
    summary: "الإخصاب: تلتقي البويضة بالحيوان المنوي في قناة فالوب لتتكوّن البويضة المخصّبة (اللاقحة).",
    points: ["تتكوّن اللاقحة في قناة فالوب", "تنقسم الخلايا وتتحول إلى كيسة أُريمية (بلاستوسيست)", "تتجه مجموعة الخلايا عبر القناة نحو الرحم"],
    milestone: "بداية الحمل فعلياً: الإخصاب.",
    src: ["medline", "cc", "acog"],
  },
  4: {
    size: "2 مم",
    like: "بذرة خشخاش",
    summary: "الانغراس: تنغرس الكيسة الأريمية في بطانة الرحم، ويبدأ هرمون الحمل بالارتفاع.",
    points: ["تتكوّن الكيس الأمنيوسي وكيس المحّ الذي يغذّي الجنين", "الطبقة الخارجية ستصبح المشيمة", "قد يظهر نزف خفيف مع الانغراس"],
    milestone: "يرتفع هرمون hCG؛ بعض اختبارات الحمل المنزلية تعمل من نحو 3.5 أسابيع.",
    src: ["nhs", "medline", "cc"],
  },
  5: {
    size: "2 مم",
    like: "بذرة سمسم",
    summary: "بداية المرحلة الجنينية: تتكوّن الأنبوبة العصبية، ويبدأ الدماغ والحبل الشوكي والقلب بالتشكّل.",
    points: ["الأنبوبة العصبية أساس الدماغ والحبل الشوكي", "أنبوب القلب يبدأ بالنبض بنحو 110 نبضة في الدقيقة", "تظهر أولى الأوعية الدموية وأساس الحبل السري"],
    milestone: "أكثر الفترات حساسية للعوامل المسببة للتشوهات الخلقية.",
    src: ["nhs", "cc", "medline"],
  },
  6: {
    size: "6 مم",
    like: "حبة بازلاء",
    summary: "تظهر براعم الذراعين والساقين، وتبدأ الدورة الدموية.",
    points: ["براعم الأطراف تظهر", "تتكوّن خلايا الدم وتبدأ الدورة الدموية", "ملامح الوجه في بداياتها"],
    milestone: "يمكن رؤية نبض القلب بالسونار المهبلي.",
    src: ["nhs", "cc", "medline"],
  },
  7: {
    size: "10 مم",
    summary: "الدماغ ينمو بسرعة كبيرة، والقلب ينبض بإيقاع منتظم.",
    points: ["ينقسم الدماغ إلى خمس مناطق، ويتكوّن نحو 100 خلية دماغية كل دقيقة", "تبدأ العينان والأذنان بالتشكّل وتنمو الجفون", "براعم الأطراف تكوّن الغضاريف"],
    src: ["nhs", "medline", "cc"],
  },
  8: {
    size: "16 مم",
    summary: "الأعضاء والأجهزة الرئيسية تتطور، واليدان والقدمان ما زالت تشبه المجاديف.",
    points: ["الحبل السري مكتمل التكوّن", "اليدان والقدمان بأصابع متصلة", "تبدأ الرئتان بالتشكّل"],
    milestone: "حول هذا الأسبوع ينتقل الوصف من «مُضغة» إلى «جنين» (تختلف المصادر بين الأسبوع 8 و10).",
    src: ["nhs", "cc", "medline"],
  },
  9: {
    size: "22 مم",
    summary: "الوجه يصبح أوضح: الجفون والفم واللسان وبراعم التذوق.",
    points: ["تبدأ الأسنان وبراعم التذوق بالتكوّن", "الرأس نحو نصف طول الجسم", "تظهر المرفقان وأصابع القدمين"],
    milestone: "قد يُسمع نبض القلب بجهاز الدوبلر.",
    src: ["nhs", "cc", "medline", "ig21"],
  },
  10: {
    size: "3 سم",
    summary: "أصابع اليدين والقدمين مكتملة ومنفصلة، والأظافر تبدأ بالنمو.",
    points: ["الجفون تنغلق", "الأمعاء تدور إلى موضعها", "القلب ينبض بنحو 180 نبضة، وتُرى حركات متقطعة في السونار"],
    milestone: "فترة سونار تحديد العمر في الثلث الأول (8–14 أسبوعاً).",
    src: ["nhs", "cc", "medline", "ig21"],
  },
  11: {
    size: "4.1 سم",
    summary: "يفتح ويغلق قبضتيه وفمه، والعظام تبدأ بالتصلّب.",
    points: ["المفاصل تعمل والجلد شفاف", "تظهر أظافر صغيرة", "الكليتان تصنعان البول والبنكرياس يفرز الإنسولين"],
    src: ["nhs", "cc", "acog", "ig21"],
  },
  12: {
    size: "5.4 سم",
    summary: "كل الأعضاء والأطراف والعظام والعضلات موجودة، وأجهزة الدورة الدموية والهضم والبول تعمل.",
    points: ["يبلع السائل الأمنيوسي ويطرحه بولاً", "نبض القلب يظهر في السونار", "خطر الإجهاض ينخفض كثيراً بعد هذا الأسبوع"],
    milestone: "يُعرض سونار تحديد العمر عادةً في هذه الفترة.",
    src: ["nhs", "cc", "ig21"],
  },
  13: {
    size: "7.4 سم",
    summary: "آخر أسابيع الثلث الأول: تتكوّن الأحبال الصوتية وتتناسب نسبة الرأس إلى الجسم.",
    points: ["الأحبال الصوتية تتكوّن", "المبيضان أو الخصيتان مكتملة داخلياً", "قد يمص إبهامه"],
    src: ["nhs", "cc", "ig21"],
  },
  14: {
    size: "8.5 سم",
    weight: "90 غ",
    summary: "بداية الثلث الثاني: الجلد يزداد سماكة ويبدأ نمو زغب ناعم.",
    points: ["الأعضاء التناسلية الخارجية مكتملة", "تبدأ بصمات الأصابع بالتكوّن", "قد تسمع القابلة النبض بجهاز دوبلر يدوي"],
    src: ["nhs", "cc", "who"],
  },
  15: {
    size: "10.1 سم",
    weight: "114 غ",
    summary: "يظهر الزغب (اللانوغو) والحواجب والرموش، والعينان تتحسسان الضوء.",
    points: ["تبدأ حركات التنفس", "الأمعاء والأذنان تنتقلان إلى موضعهما النهائي", "العظام الطويلة تتصلّب"],
    src: ["nhs", "cc", "acog", "who"],
  },
  16: {
    size: "11.6 سم",
    weight: "144 غ",
    summary: "تعابير وجه عشوائية، ويضم يديه في قبضة.",
    points: ["الشفتان موجودتان", "الأذنان تلتقطان الكلام", "العينان المغلقتان تتفاعلان مع الضوء"],
    src: ["nhs", "cc", "who"],
  },
  17: {
    size: "12 سم",
    weight: "179 غ",
    summary: "تبدأ الطبقة الدهنية الواقية (الطلاء الجبني) بالظهور، ويتفاعل مع الأصوات العالية.",
    points: ["الأظافر وبصمات الأصابع الفريدة تتكوّن", "يتفاعل مع الأصوات المرتفعة", "كثير من الأمهات يشعرن بالحركة بين 18 و24 أسبوعاً"],
    src: ["nhs", "cc", "who"],
  },
  18: {
    size: "14.2 سم",
    weight: "222 غ",
    summary: "الزغب يغطي الجسم، وقد تظهر دورة نوم واستيقاظ.",
    points: ["السمع والبلع والمص تتطور", "قد توقظه الأصوات", "الحركة تصبح أوضح"],
    milestone: "تبدأ فترة سونار التشوهات (التفصيلي) بين 18 و21 أسبوعاً.",
    src: ["nhs", "cc", "who"],
  },
  19: {
    size: "15.3 سم",
    weight: "272 غ",
    summary: "معظم الأمهات يشعرن بالركلات الآن، وقد يصاب بالفُواق.",
    points: ["بصمات الأصابع فريدة", "تتكوّن براعم الأسنان الدائمة خلف اللبنية", "الإحساس الأول بالحركة غالباً بين 19 و21 أسبوعاً"],
    src: ["nhs", "cc", "medline", "who"],
  },
  20: {
    size: "25.6 سم",
    weight: "330 غ",
    summary: "منتصف الحمل: يغطيه الطلاء الجبني، وتتطور مناطق الدماغ الخاصة بالحواس الخمس.",
    points: ["الجهاز الهضمي يعمل", "الأذنان والأنف والشفتان تُرى بالسونار", "المنطقة الحركية في الدماغ مكتملة"],
    milestone: "منتصف الطريق، وقد يكون سونار التشوهات هذا الأسبوع. (الطول من هنا يُقاس من الرأس إلى الكعب.)",
    src: ["nhs", "cc", "acog", "who"],
  },
  21: {
    size: "26.7 سم",
    weight: "398 غ",
    summary: "نخاع العظم يصنع خلايا الدم، وحركات الأطراف متناسقة.",
    points: ["وزنه الآن أكبر من وزن المشيمة", "يسمع الأصوات من خارج الرحم", "يستطيع البلع"],
    src: ["nhs", "cc", "medline", "who"],
  },
  22: {
    size: "27.8 سم",
    weight: "476 غ",
    summary: "الزغب يغطي كامل الجسم، وتظهر الحواجب والرموش.",
    points: ["يتكوّن العِقي (أول براز) في الأمعاء", "يتدرّب على التنفس ويبلع السائل", "يمكن سماع النبض بالسماعة الطبية"],
    src: ["nhs", "medline", "who"],
  },
  23: {
    size: "28.9 سم",
    weight: "565 غ",
    summary: "يكتسب الدهون بسرعة، وتبدأ أنماط النوم والاستيقاظ.",
    points: ["الأطراف متناسبة مع الجسم", "أنماط نوم واستيقاظ", "الحركة أكثر تكراراً"],
    src: ["nhs", "cc", "who"],
  },
  24: {
    size: "30 سم",
    weight: "665 غ",
    summary: "الرئتان متكوّنتان لكنهما غير ناضجتين بعد للعمل خارج الرحم.",
    points: ["تتكوّن خطوط بصمات الأصابع", "الجلد مجعّد ومائل للحمرة", "يتطور منعكس المص"],
    milestone: "بلوغ مرحلة القابلية للحياة: قد ينجو إن وُلد الآن مع رعاية العناية المركزة لحديثي الولادة.",
    src: ["nhs", "cc", "acog", "who"],
  },
  25: {
    size: "34.6 سم",
    weight: "778 غ",
    summary: "الدهون تجعل الجلد أكثر امتلاءً، والجهاز العصبي ينضج بسرعة.",
    points: ["يُفزع من الأصوات ويصاب بالفُواق", "معظم السائل الأمنيوسي الآن من بوله", "تتطور الممرات الهوائية السفلية"],
    src: ["nhs", "cc", "medline", "who"],
  },
  26: {
    size: "35.6 سم",
    weight: "902 غ",
    summary: "الرئتان تبدآن بإنتاج مادة «السيرفاكتانت» التي تساعد على التنفس لاحقاً.",
    points: ["يبدأ إنتاج صبغة الميلانين", "أجزاء العين مكتملة، وقد تنفتح العينان لأول مرة", "تتكوّن بصمات القدمين والحويصلات الهوائية"],
    src: ["nhs", "cc", "medline", "who"],
  },
  27: {
    size: "36.6 سم",
    weight: "1.04 كغ",
    summary: "آخر أسابيع الثلث الثاني: يفتح عينيه ويرمش، والرموش موجودة.",
    points: ["يفتح عينيه ويرمش", "يزداد امتلاءً", "الرئتان قادرتان على التنفس لكنهما تواصلان النضج"],
    src: ["nhs", "cc", "who"],
  },
  28: {
    size: "37.6 سم",
    weight: "1.19 كغ",
    summary: "بداية الثلث الثالث: قد يبدأ بالاستدارة ليصبح رأسه للأسفل.",
    points: ["النبض نحو 140 في الدقيقة ويُسمع بالسماعة", "الجفون تنفتح وتنغلق", "يبدأ إنتاج السيرفاكتانت في الرئتين"],
    milestone: "بداية الثلث الثالث.",
    src: ["nhs", "cc", "acog", "who"],
  },
  29: {
    size: "38.6 سم",
    weight: "1.35 كغ",
    summary: "الأعضاء تنضج ويكتسب الدهون، والركلات تصبح أشبه بالوخزات مع ضيق المساحة.",
    points: ["العينان تحسّان بالضوء", "نخاع العظم يصنع كريات الدم الحمراء", "الزغب يبدأ بالاختفاء"],
    src: ["nhs", "cc", "acog", "who"],
  },
  30: {
    size: "39.9 سم",
    weight: "1.52 كغ",
    summary: "يستطيع تنظيم حرارة جسمه، والدماغ ينمو بسرعة.",
    points: ["العينان تستطيعان التركيز", "الدماغ ينمو بسرعة", "يواصل اكتساب الوزن"],
    src: ["nhs", "cc", "who"],
  },
  31: {
    size: "41.1 سم",
    weight: "1.71 كغ",
    summary: "أنماط نوم واستيقاظ واضحة، ويتعرّف على الأصوات من خارج الرحم.",
    points: ["يتنفس بإيقاع منتظم رغم عدم نضج الرئتين", "يخزّن الحديد والكالسيوم والفوسفور", "يتعرّف على الأصوات المألوفة"],
    src: ["nhs", "cc", "medline", "who"],
  },
  32: {
    size: "42.4 سم",
    weight: "1.9 كغ",
    summary: "الجلد لم يعد شفافاً، ومعظم الأعضاء متكوّنة عدا الرئتين والدماغ اللذين يواصلان النضج.",
    points: ["مكتمل التكوين ويركّز الآن على اكتساب الوزن", "الجلد غير شفاف", "الرئتان والدماغ يواصلان النضج"],
    src: ["nhs", "cc", "who"],
  },
  33: {
    size: "43.7 سم",
    weight: "2.1 كغ",
    summary: "العظام تتصلّب، لكن الجمجمة تبقى ليّنة لتسهيل الولادة.",
    points: ["الجمجمة تبقى ليّنة", "العظام تتصلّب", "يواصل اكتساب الدهون"],
    src: ["nhs", "cc", "acog", "who"],
  },
  34: {
    size: "45 سم",
    weight: "2.31 كغ",
    summary: "الطلاء الجبني يزداد سماكة، ويتكوّر في وضعية الجنين.",
    points: ["الطلاء الجبني أكثر سماكة", "عند الذكور تنزل الخصيتان إلى كيس الصفن", "يتكوّر مع ضيق المساحة"],
    src: ["nhs", "cc", "who"],
  },
  35: {
    size: "46.2 سم",
    weight: "2.53 كغ",
    summary: "يزداد امتلاءً، والدماغ ما زال نحو ثلثي وزنه عند الولادة.",
    points: ["الدماغ يواصل النمو", "أنماط نوم محددة", "يجب أن تبقى الحركة قوية كما كانت"],
    milestone: "أي انخفاض في الحركة المعتادة يستدعي التواصل مع الطبيب فوراً.",
    src: ["nhs", "cc", "medline", "who"],
  },
  36: {
    size: "47.4 سم",
    weight: "2.75 كغ",
    summary: "الزغب يتساقط وشعر الرأس موجود، والرئتان على الأرجح ناضجتان للتنفس.",
    points: ["الأظافر تصل إلى أطراف الأصابع", "الأطراف ممتلئة", "قد يستدير ليصبح رأسه للأسفل"],
    src: ["nhs", "cc", "acog", "who"],
  },
  37: {
    size: "48.6 سم",
    weight: "2.97 كغ",
    summary: "بداية الحمل المكتمل المبكر: قد ينزل الرأس إلى الحوض.",
    points: ["أظافر القدمين تصل إلى أطراف الأصابع", "الجهاز الدوري والعضلي الهيكلي مكتملان", "الرئتان والدماغ والجهاز العصبي في اللمسات الأخيرة"],
    milestone: "حمل مكتمل مبكر (37+0 إلى 38+6) حسب ACOG.",
    src: ["nhs", "cc", "acog", "acogTerm", "who"],
  },
  38: {
    size: "49.8 سم",
    weight: "3.19 كغ",
    summary: "يكتسب نحو 230 غراماً أسبوعياً، والزغب اختفى تقريباً.",
    points: ["العِقي مخزّن في الأمعاء", "يظهر شعر الرأس الخشن", "يواصل اكتساب الوزن"],
    src: ["nhs", "cc", "medline", "who"],
  },
  39: {
    size: "50.7 سم",
    weight: "3.4 كغ",
    summary: "حمل مكتمل: تتكوّن طبقة جلد خارجية أقوى، وقد يبقى بعض الطلاء الجبني.",
    points: ["جلد خارجي أقوى", "قد يبقى بعض الطلاء الجبني", "مستعد للولادة"],
    milestone: "حمل مكتمل (39+0 إلى 40+6) حسب ACOG، وهي الفترة الأقل مضاعفات لحديثي الولادة.",
    src: ["nhs", "cc", "acogTerm", "who"],
  },
  40: {
    size: "51.2 سم",
    weight: "3.62 كغ",
    summary: "موعد الولادة المتوقع: 280 يوماً من أول يوم في آخر دورة، أي نحو 38 أسبوعاً منذ الإخصاب.",
    points: ["نحو 1 من كل 20 امرأة فقط تلد في الموعد المحدد", "قد تتجاوز الأظافر أطراف الأصابع", "الطبيب هو المرجع للخطوات التالية إن تأخرت الولادة"],
    milestone: "بعد الأسبوع 41 يُعد الحمل متأخراً، وبعد 42 ممتداً؛ قد تُعرض مراقبة إضافية أو تحريض للولادة.",
    src: ["nhs", "cc", "acog", "acogTerm", "medline", "who"],
  },
};

function sourcesFor(week: number, keys: SourceKey[]): WeeklySourceRef[] {
  // NHS publishes week pages from week 4; earlier weeks cite its guide index only when asked for.
  return keys.map((k) => (k === "nhs" ? (week >= 4 ? nhsWeek(week) : S.nhsGuide) : S[k]));
}

function build(week: number, seed: WeekSeed): WeeklyBabyMedia {
  const nn = String(week).padStart(2, "0");
  const image = SOURCED_IMAGES[week];
  return {
    week,
    videoMp4: undefined,
    videoWebm: undefined,
    posterWebp: image?.poster,
    thumbnailWebp: image?.thumb,
    alt: image ? `${image.credit.depicts} — صورة من مصدر مفتوح الترخيص، ليست صورة تشخيصية` : `لا صورة متاحة للأسبوع ${week}`,
    imageCredit: image?.credit,
    developmentSummary: seed.summary,
    developmentPoints: seed.points,
    approximateSize: seed.size,
    lengthMeasure: seed.size ? (week < 20 ? "crown_rump" : "crown_heel") : undefined,
    approximateSizeComparison: seed.like,
    approximateWeight: seed.weight,
    milestone: seed.milestone,
    sources: sourcesFor(week, seed.src),
    focalPoint: image?.focalPoint ?? { x: 0.5, y: 0.5 },
    safeArea: { top: 0.28, right: 0.05, bottom: 0.3, left: 0.45 },
    loopDurationSeconds: 6,
    medicallyReviewed: false,
    reviewNotes: `week-${nn}: نص مستخلص من المصادر المذكورة؛ يحتاج مراجعة طبية قبل النشر.`,
  };
}

export const WEEKLY_MEDIA: ReadonlyMap<number, WeeklyBabyMedia> = new Map(
  Object.entries(SEED).map(([w, seed]) => [Number(w), build(Number(w), seed)] as const),
);

export function weeklyMedia(week: number): WeeklyBabyMedia {
  const clamped = Math.max(MEDIA_MIN_WEEK, Math.min(MEDIA_MAX_WEEK, Math.round(week)));
  return WEEKLY_MEDIA.get(clamped)!;
}

export function adjacentWeeks(week: number): number[] {
  return [week - 1, week + 1].filter((w) => w >= MEDIA_MIN_WEEK && w <= MEDIA_MAX_WEEK);
}

/** Production readiness summary used by the asset backlog and dev badge. */
export function weeklyMediaInventory() {
  const entries = [...WEEKLY_MEDIA.values()];
  return {
    total: entries.length,
    withVideo: entries.filter((e) => e.videoMp4).length,
    withPoster: entries.filter((e) => e.posterWebp).length,
    reviewed: entries.filter((e) => e.medicallyReviewed).length,
  };
}
