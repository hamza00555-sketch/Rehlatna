import type { WeeklyBabyMedia } from "@/domain/types";
import { MEDIA_MAX_WEEK, MEDIA_MIN_WEEK } from "@/domain/pregnancy";

/**
 * Weekly baby media manifest — weeks 5 through 40.
 *
 * STATUS: no production loops or posters are attached to this repository.
 * Every entry is `medicallyReviewed: false`, `posterWebp` is undefined and
 * the Hero renders the approved neutral placeholder. Production paths follow
 * the naming in docs/asset-backlog.md:
 *   /media/weekly/week-NN.mp4 · week-NN.webm · week-NN.poster.webp · week-NN.thumb.webp
 *
 * Development text is GENERAL information (size comparisons and broad
 * development themes commonly published for expectant parents). It is not
 * diagnostic, not personalised, and is flagged for medical review.
 */

interface WeekSeed {
  size: string;
  like: string;
  weight?: string;
  summary: string;
  points: string[];
}

const SEED: Record<number, WeekSeed> = {
  5: { size: "2 مم", like: "بذرة سمسم", summary: "بداية صغيرة جداً، تتشكّل فيها الأنبوبة العصبية وأساس القلب.", points: ["تبدأ الأنبوبة العصبية بالتشكّل", "يظهر أساس القلب والدورة الدموية", "المشيمة في بداياتها"] },
  6: { size: "5 مم", like: "حبة عدس", summary: "يبدأ القلب بالنبض، وتظهر براعم الأطراف الأولى.", points: ["نبض القلب قد يُرصد بالسونار", "براعم الذراعين والساقين", "ملامح الوجه في أولى مراحلها"] },
  7: { size: "1 سم", like: "حبة توت أزرق", summary: "الرأس يكبر بسرعة، والدماغ يتطوّر بوتيرة عالية.", points: ["تتكوّن نصفا الدماغ", "تظهر فتحات الأنف وعدستا العينين", "تتشكّل الكليتان"] },
  8: { size: "1.6 سم", like: "حبة توت العليق", weight: "1 غ", summary: "تتشكّل الملامح الأساسية، والقلب ينبض بانتظام.", points: ["ملامح الوجه والعينان في التكوّن", "القلب ينبض بانتظام وتتشكّل الأوعية", "الأطراف تستطيل وتظهر الأصابع"] },
  9: { size: "2.3 سم", like: "حبة عنب", weight: "2 غ", summary: "تتّضح الأصابع، وتبدأ العضلات الصغيرة بالعمل.", points: ["الأصابع تنفصل", "حركات دقيقة لا تُحسّ بعد", "تتشكّل الأعضاء الأساسية"] },
  10: { size: "3.1 سم", like: "حبة فراولة", weight: "4 غ", summary: "انتهت مرحلة الجنين المبكرة؛ الأعضاء كلها موجودة وتنمو.", points: ["الأعضاء الحيوية مكتملة التكوّن الأولي", "تبدأ الأظافر بالظهور", "المفاصل تعمل"] },
  11: { size: "4.1 سم", like: "حبة تين", weight: "7 غ", summary: "الرأس ما زال كبيراً نسبياً، والجسم يستقيم تدريجياً.", points: ["الأذنان تقتربان من موضعهما", "براعم الأسنان تحت اللثة", "الحجاب الحاجز يتشكّل"] },
  12: { size: "5.4 سم", like: "ليمونة صغيرة", weight: "14 غ", summary: "اكتمال الثلث الأول تقريباً؛ ردود الفعل تبدأ.", points: ["يفتح ويغلق الأصابع", "الأمعاء تنتقل إلى موضعها", "ينتج البول ويطرحه في السائل"] },
  13: { size: "7.4 سم", like: "حبة خوخ", weight: "23 غ", summary: "الجسم ينمو أسرع من الرأس، والأحبال الصوتية تتشكّل.", points: ["بصمات الأصابع تظهر", "الأحبال الصوتية في التكوّن", "الأمعاء تتحرك نحو البطن"] },
  14: { size: "8.7 سم", like: "ليمونة", weight: "43 غ", summary: "تعابير الوجه الأولى، ونمو زغب ناعم على الجسم.", points: ["يحرّك ملامح وجهه", "يظهر زغب ناعم يحمي البشرة", "الكليتان تعملان"] },
  15: { size: "10.1 سم", like: "تفاحة", weight: "70 غ", summary: "يستشعر الضوء عبر الجفون المغلقة، ويتحرك كثيراً.", points: ["الهيكل العظمي يتصلّب", "حركات أكثر لا تُحسّ عادةً بعد", "يستشعر الضوء"] },
  16: { size: "11.6 سم", like: "أفوكادو", weight: "100 غ", summary: "العينان تتحركان، وقد تبدأ الأم بالإحساس برفرفة خفيفة.", points: ["عضلات الظهر تتقوّى", "العينان تتحركان جانبياً", "أول رفرفة محتملة"] },
  17: { size: "13 سم", like: "كمثرى", weight: "140 غ", summary: "تتكوّن الدهون تحت الجلد، والقلب أكثر انتظاماً.", points: ["الدهون تبدأ بالتراكم", "القلب ينظّمه الدماغ", "بصمات مكتملة"] },
  18: { size: "14.2 سم", like: "فلفلة حلوة", weight: "190 غ", summary: "الأذنان في موضعهما النهائي؛ قد يسمع الأصوات القريبة.", points: ["يبدأ بالسمع", "الجهاز العصبي يتطور", "حركات واضحة أكثر"] },
  19: { size: "15.3 سم", like: "مانجو", weight: "240 غ", summary: "تغطي البشرة طبقة واقية شمعية، والحواس تتطور.", points: ["طبقة واقية على البشرة", "الحواس تتخصّص في الدماغ", "فحص السونار التفصيلي عادةً في هذه الفترة"] },
  20: { size: "25 سم", like: "موزة", weight: "300 غ", summary: "منتصف الطريق. يبتلع السائل ويتدرّب على الهضم.", points: ["منتصف الحمل", "يبلع ويهضم", "نمو الشعر والأظافر"] },
  21: { size: "26.7 سم", like: "جزرة", weight: "360 غ", summary: "الحركات تتحوّل إلى ركلات مميزة، والنمو أبطأ وأثبت.", points: ["ركلات مميزة", "نخاع العظم ينتج الدم", "يتذوق ما تتذوقه الأم"] },
  22: { size: "27.8 سم", like: "بابايا صغيرة", weight: "430 غ", summary: "ملامح الوجه واضحة، والجفون والحواجب مكتملة.", points: ["الجفون والحواجب مكتملة", "البشرة مجعّدة حتى تتراكم الدهون", "يستجيب للأصوات"] },
  23: { size: "28.9 سم", like: "مانجو كبيرة", weight: "500 غ", summary: "الرئتان تستعدّان للتنفس، والسمع يزداد دقة.", points: ["الرئتان تطوّران الأوعية", "يميّز نبض الأم", "حركات متكررة"] },
  24: { size: "30 سم", like: "كوز ذرة", weight: "600 غ", summary: "الرئتان تنتجان مادة تساعد على التنفس لاحقاً.", points: ["الوجه مكتمل تقريباً", "دورات نوم واستيقاظ", "يستجيب للمس"] },
  25: { size: "34.6 سم", like: "لفت", weight: "660 غ", summary: "يستجيب للصوت والضوء بوضوح، وينمو الشعر.", points: ["استجابة للأصوات المألوفة", "الأنف يبدأ بالعمل", "زيادة في الدهون"] },
  26: { size: "35.6 سم", like: "خسّة", weight: "760 غ", summary: "العينان تبدآن بالانفتاح، والرئتان تنضجان.", points: ["العينان تنفتحان", "يتنفس السائل تدريباً", "الجهاز العصبي أكثر نشاطاً"] },
  27: { size: "36.6 سم", like: "قرنبيط", weight: "875 غ", summary: "بداية الثلث الثالث. ينام ويستيقظ بانتظام.", points: ["دورات نوم واضحة", "يفتح ويغلق عينيه", "قد يحدث الفُواق"] },
  28: { size: "37.6 سم", like: "باذنجان كبير", weight: "1 كغ", summary: "يرمش ويحلم، والدماغ يتطوّر تلافيفه.", points: ["يرمش", "تلافيف الدماغ تتعمّق", "الرئتان أكثر نضجاً"] },
  29: { size: "38.6 سم", like: "قرع عسل صغير", weight: "1.15 كغ", summary: "العضلات والرئتان تنضجان، والحركات أقوى.", points: ["ركلات أقوى", "العظام تتصلّب", "الرأس يكبر لاستيعاب الدماغ"] },
  30: { size: "39.9 سم", like: "ملفوف كبير", weight: "1.3 كغ", summary: "البشرة أنعم مع تراكم الدهون، والحركة أقل مساحةً.", points: ["الدهون تملأ البشرة", "الزغب يبدأ بالاختفاء", "يميّز الضوء والظل"] },
  31: { size: "41.1 سم", like: "جوز الهند", weight: "1.5 كغ", summary: "الحواس الخمس تعمل، والنمو يتركّز في الوزن.", points: ["الحواس الخمس تعمل", "ينمو الوزن أسرع من الطول", "يتحرك في مساحة أضيق"] },
  32: { size: "42.4 سم", like: "كرنب صيني", weight: "1.7 كغ", summary: "يتّجه رأسه للأسفل غالباً استعداداً للوصول.", points: ["وضعية الرأس للأسفل غالباً", "الأظافر مكتملة", "الشعر ينمو"] },
  33: { size: "43.7 سم", like: "أناناس", weight: "1.9 كغ", summary: "العظام تتصلّب عدا الجمجمة التي تبقى مرنة للولادة.", points: ["الجمجمة مرنة", "المناعة تتشكّل من الأم", "الرئتان شبه ناضجتين"] },
  34: { size: "45 سم", like: "شمّام", weight: "2.1 كغ", summary: "الطبقة الواقية تزداد، ويتدرّب على التنفس.", points: ["الطبقة الواقية أكثر سماكة", "يتعرّف على صوت الأم", "الأظافر تصل لأطراف الأصابع"] },
  35: { size: "46.2 سم", like: "شمّام عسلي", weight: "2.4 كغ", summary: "الكليتان مكتملتان، والكبد يعمل، والوزن يزداد أسبوعياً.", points: ["الكليتان مكتملتان", "معظم الأجهزة جاهزة", "يزداد الوزن أسبوعياً"] },
  36: { size: "47.4 سم", like: "خس روماني", weight: "2.6 كغ", summary: "يقل السائل الأمنيوسي نسبياً، ووقت تجهيز الحقيبة.", points: ["الرأس قد يستقر في الحوض", "الرئتان ناضجتان تقريباً", "تجهيز حقيبة المستشفى"] },
  37: { size: "48.6 سم", like: "حزمة كرفس", weight: "2.9 كغ", summary: "بداية نافذة الولادة المتوقعة؛ الأجهزة جاهزة تقريباً.", points: ["بداية النافذة المتوقعة", "يتدرّب على المص", "الدهون تكتمل"] },
  38: { size: "49.8 سم", like: "كرّاث", weight: "3.1 كغ", summary: "يشدّ قبضته، والأعضاء مكتملة النضج.", points: ["قبضة قوية", "الرئتان جاهزتان", "الوزن يزداد ببطء"] },
  39: { size: "50.7 سم", like: "بطيخة صغيرة", weight: "3.3 كغ", summary: "مكتمل النمو؛ الوصول قد يكون في أي وقت.", points: ["مكتمل النمو", "الدماغ يواصل تطوره بعد الولادة", "الجلد وردي وناعم"] },
  40: { size: "51.2 سم", like: "قرع عسل", weight: "3.4 كغ", summary: "موعد الوصول المتوقع. كثير من الأطفال يصلون قبله أو بعده بأيام.", points: ["الموعد تقديري", "الطبيب هو المرجع للخطوات التالية", "الرحلة تستمر بعد الولادة"] },
};

function build(week: number, seed: WeekSeed): WeeklyBabyMedia {
  const nn = String(week).padStart(2, "0");
  return {
    week,
    // Production paths — files are not present yet; see docs/asset-backlog.md.
    videoMp4: undefined,
    videoWebm: undefined,
    posterWebp: undefined,
    thumbnailWebp: undefined,
    alt: `صورة تمثيلية عامة لمرحلة الأسبوع ${week} من الحمل — ليست صورة تشخيصية`,
    developmentSummary: seed.summary,
    developmentPoints: seed.points,
    approximateSize: seed.size,
    approximateSizeComparison: seed.like,
    approximateWeight: seed.weight,
    // Baby sits slightly right of centre and low; text lives on the start side.
    focalPoint: { x: 0.62, y: 0.55 },
    safeArea: { top: 0.28, right: 0.05, bottom: 0.3, left: 0.45 },
    loopDurationSeconds: 6,
    medicallyReviewed: false,
    reviewNotes: `week-${nn}: يحتاج مراجعة طبية قبل النشر؛ لا أصول إنتاجية مرفقة.`,
  };
}

export const WEEKLY_MEDIA: ReadonlyMap<number, WeeklyBabyMedia> = new Map(
  Object.entries(SEED).map(([w, seed]) => [Number(w), build(Number(w), seed)] as const),
);

export function weeklyMedia(week: number): WeeklyBabyMedia {
  const clamped = Math.min(MEDIA_MAX_WEEK, Math.max(MEDIA_MIN_WEEK, Math.round(week)));
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
