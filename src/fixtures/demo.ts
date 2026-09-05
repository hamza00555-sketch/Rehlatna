import type { HouseholdData } from "@/domain/types";
import { permissionsForRoles } from "@/domain/permissions";
import { addDays } from "@/domain/dates";
import { appConfig } from "@/config/app";

/**
 * DEMO FIXTURES — generic fictional data only. Never loaded in live mode;
 * the demo store is an in-memory instance seeded from here and resettable.
 *
 * Two scenarios: a populated pregnancy (week ~22, no name, gender not yet
 * recorded — exercising the neutral paths) and a postpartum household
 * (day 12, named, no personal photo → neutral fallback hero).
 */

export const DEMO_HOUSEHOLD_PREGNANCY = "demo_pregnancy";
export const DEMO_HOUSEHOLD_POSTPARTUM = "demo_postpartum";

const MEMBER_MOTHER = "demo_m_mother";
const MEMBER_PARTNER = "demo_m_partner";
const MEMBER_SUPPORTER = "demo_m_supporter";
const USER_MOTHER = "demo_u_mother";
const USER_PARTNER = "demo_u_partner";
const USER_SUPPORTER = "demo_u_supporter";

export function demoPregnancyHousehold(today: string): HouseholdData {
  const h = DEMO_HOUSEHOLD_PREGNANCY;
  // Week 22, day 3 → gestational day 157; due = today + (280 − 157).
  const dueDate = addDays(today, 280 - 157);
  const createdAt = `${addDays(today, -110)}T09:00:00.000Z`;
  const motherRoles = ["mother"] as const;
  const partnerRoles = ["partner", "financial_planner"] as const;
  const supporterRoles = ["family_supporter"] as const;

  return {
    household: {
      id: h,
      createdAt,
      settings: {
        productName: appConfig.defaultProductName,
        currencyCode: "SAR",
        financeEnabled: true,
        financeShared: false,
        theme: "system",
      },
    },
    users: [
      { id: USER_MOTHER, displayName: "ريما", createdAt },
      { id: USER_PARTNER, displayName: "يزيد", createdAt },
      { id: USER_SUPPORTER, displayName: "الجدة", createdAt },
    ],
    members: [
      { id: MEMBER_MOTHER, householdId: h, userId: USER_MOTHER, displayName: "ريما", roles: [...motherRoles], permissions: permissionsForRoles([...motherRoles]) },
      { id: MEMBER_PARTNER, householdId: h, userId: USER_PARTNER, displayName: "يزيد", roles: [...partnerRoles], permissions: permissionsForRoles([...partnerRoles]) },
      { id: MEMBER_SUPPORTER, householdId: h, userId: USER_SUPPORTER, displayName: "الجدة", roles: [...supporterRoles], permissions: permissionsForRoles([...supporterRoles]) },
    ],
    pregnancy: {
      id: "demo_p1",
      householdId: h,
      dueDate,
      followUpCity: "الدمام",
      deliveryCity: "جدة",
      mode: "pregnancy",
      createdAt,
      dueDateHistory: [],
    },
    baby: { id: "demo_b1", householdId: h, displayName: null, gender: "unknown" },
    milestones: [
      {
        id: "demo_ms_hospital",
        householdId: h,
        type: "family",
        title: "قررنا مستشفى الولادة",
        description: "بعد زيارة مستشفيين، استقرّينا على مستشفى الولادة في مدينة الولادة.",
        date: addDays(today, -18),
        origin: "user",
      },
      {
        id: "demo_ms_travel",
        householdId: h,
        type: "travel",
        title: "الانتقال إلى مدينة الولادة",
        description: "خطة السفر قبل نافذة الولادة بأسبوعين.",
        date: addDays(today, 100),
        origin: "user",
      },
    ],
    appointments: [
      {
        id: "demo_a1",
        householdId: h,
        type: "checkup",
        date: addDays(today, -52),
        time: "10:30",
        doctorId: "demo_dr1",
        hospitalId: "demo_h1",
        city: "الدمام",
        preparationTasks: [],
        status: "done",
        reminder: false,
      },
      {
        id: "demo_a2",
        householdId: h,
        type: "ultrasound",
        date: addDays(today, -24),
        time: "09:00",
        doctorId: "demo_dr1",
        hospitalId: "demo_h1",
        city: "الدمام",
        notes: "سونار الثلث الثاني.",
        preparationTasks: [],
        status: "done",
        reminder: false,
      },
      {
        id: "demo_a3",
        householdId: h,
        type: "checkup",
        date: addDays(today, 2),
        time: "11:15",
        doctorId: "demo_dr1",
        hospitalId: "demo_h1",
        city: "الدمام",
        notes: "متابعة دورية ونتائج التحاليل.",
        preparationTasks: [
          { id: "demo_t1", title: "إحضار نتائج التحاليل الأخيرة", done: true },
          { id: "demo_t2", title: "تدوين الأسئلة عن السفر للولادة", done: false },
        ],
        status: "upcoming",
        reminder: true,
      },
      {
        id: "demo_a4",
        householdId: h,
        type: "delivery_planning",
        date: addDays(today, 60),
        doctorId: "demo_dr2",
        hospitalId: "demo_h2",
        city: "جدة",
        preparationTasks: [],
        status: "upcoming",
        reminder: true,
      },
    ],
    ultrasounds: [
      {
        id: "demo_us1",
        householdId: h,
        appointmentId: "demo_a2",
        date: addDays(today, -24),
        gestationalWeek: 19,
        notes: "كل شيء ضمن المتوقع بحسب الطبيبة. الصور محفوظة على الجهاز.",
        mediaAssetIds: [],
      },
    ],
    careProviders: [
      { id: "demo_dr1", householdId: h, kind: "follow_up", name: "د. هند الراشد", specialty: "نساء وولادة", hospitalId: "demo_h1", city: "الدمام", phone: "0500000001" },
      { id: "demo_dr2", householdId: h, kind: "delivery", name: "د. لمى الحارثي", specialty: "نساء وولادة", hospitalId: "demo_h2", city: "جدة", phone: "0500000002" },
      { id: "demo_dr3", householdId: h, kind: "backup", name: "د. سامي العمري", specialty: "نساء وولادة", hospitalId: "demo_h2", city: "جدة" },
    ],
    hospitals: [
      { id: "demo_h1", householdId: h, name: "مستشفى الواحة التخصصي", city: "الدمام", purposes: ["follow_up"], phone: "0138000000", insuranceBelievedCovered: true, insuranceLastVerifiedAt: addDays(today, -40) },
      { id: "demo_h2", householdId: h, name: "مستشفى النخيل للولادة", city: "جدة", purposes: ["delivery", "emergency"], phone: "0126000000", insuranceBelievedCovered: true, insuranceLastVerifiedAt: addDays(today, -95), notes: "الجناح الخاص يحتاج تأكيداً مسبقاً." },
    ],
    insurance: [
      { id: "demo_ins1", householdId: h, provider: "شركة الأمان للتأمين (اسم تجريبي)", planName: "الفئة الذهبية", coverageNotes: "تغطية الولادة الطبيعية والقيصرية بحسب البرنامج. الجناح الخاص غير مؤكد.", candidateHospitalIds: ["demo_h1", "demo_h2"], lastVerifiedAt: addDays(today, -95) },
    ],
    verificationTasks: [
      { id: "demo_vt1", householdId: h, subject: "تأكيد تغطية مستشفى النخيل للولادة قبل السفر", relatedHospitalId: "demo_h2", relatedInsuranceId: "demo_ins1", done: false, createdAt },
    ],
    preparationItems: [
      { id: "demo_pi_crib", householdId: h, category: "sleep", title: "سرير الصغير", status: "owned", size: "object", inHospitalBag: false, updatedAt: createdAt },
      { id: "demo_pi_bassinet", householdId: h, category: "sleep", title: "مهد بجانب السرير", status: "undecided", size: "object", inHospitalBag: false, updatedAt: createdAt },
      { id: "demo_pi_sheets", householdId: h, category: "sleep", title: "أغطية قطنية", status: "need_to_buy", size: "task", inHospitalBag: false, updatedAt: createdAt },
      { id: "demo_pi_stroller", householdId: h, category: "mobility", title: "عربة الأطفال", status: "owned", size: "object", inHospitalBag: false, updatedAt: createdAt },
      { id: "demo_pi_carseat", householdId: h, category: "mobility", title: "مقعد السيارة", status: "need_to_buy", size: "object", inHospitalBag: false, updatedAt: createdAt },
      { id: "demo_pi_bottles", householdId: h, category: "feeding", title: "زجاجات ومستلزمات التخزين", status: "undecided", size: "task", inHospitalBag: false, updatedAt: createdAt },
      { id: "demo_pi_pump", householdId: h, category: "feeding", title: "مضخة حليب", status: "undecided", size: "object", inHospitalBag: false, updatedAt: createdAt },
      { id: "demo_pi_clothes", householdId: h, category: "clothing", title: "ملابس حديثي الولادة", status: "need_to_buy", size: "task", inHospitalBag: true, updatedAt: createdAt },
      { id: "demo_pi_blanket", householdId: h, category: "clothing", title: "بطانية خفيفة", status: "owned", size: "task", inHospitalBag: true, updatedAt: createdAt },
      { id: "demo_pi_diapers", householdId: h, category: "care", title: "حفاضات حديثي الولادة", status: "need_to_buy", size: "task", inHospitalBag: true, updatedAt: createdAt },
      { id: "demo_pi_bath", householdId: h, category: "care", title: "حوض استحمام صغير", status: "not_required", size: "object", inHospitalBag: false, updatedAt: createdAt },
      { id: "demo_pi_docs", householdId: h, category: "hospital", title: "الأوراق: الهوية، بطاقة التأمين، ملف المتابعة", status: "owned", size: "task", inHospitalBag: true, updatedAt: createdAt },
      { id: "demo_pi_mother_bag", householdId: h, category: "hospital", title: "حقيبة السفر للولادة", status: "need_to_buy", size: "object", inHospitalBag: true, updatedAt: createdAt },
      { id: "demo_pi_travel_docs", householdId: h, category: "travel", title: "حجز الإقامة قرب مستشفى الولادة", status: "undecided", size: "task", inHospitalBag: false, updatedAt: createdAt },
      { id: "demo_pi_mother_pp", householdId: h, category: "mother_postpartum", title: "مستلزمات الأم بعد الولادة", status: "undecided", size: "task", inHospitalBag: true, updatedAt: createdAt },
    ],
    fundingGoals: [
      {
        id: "demo_g_carseat",
        householdId: h,
        name: "مقعد السيارة",
        expectedCost: 1200,
        fundedAmount: 400,
        fundingDate: addDays(today, 75),
        spendingDate: addDays(today, 90),
        phase: "before_birth",
        priority: "essential",
        preparationItemId: "demo_pi_carseat",
        visibility: "private",
        ownerUserId: USER_PARTNER,
        createdAt,
      },
      {
        id: "demo_g_hospital",
        householdId: h,
        name: "تكاليف المستشفى غير المشمولة",
        expectedCost: 6000,
        fundedAmount: 6000,
        fundingDate: addDays(today, 110),
        spendingDate: addDays(today, 123),
        phase: "at_birth",
        priority: "essential",
        visibility: "private",
        ownerUserId: USER_PARTNER,
        createdAt,
      },
      {
        id: "demo_g_travel",
        householdId: h,
        name: "إقامة أسبوعين في مدينة الولادة",
        expectedCost: 4500,
        fundedAmount: 1500,
        fundingDate: addDays(today, 95),
        spendingDate: addDays(today, 100),
        phase: "at_birth",
        priority: "important",
        visibility: "private",
        ownerUserId: USER_PARTNER,
        createdAt,
      },
      {
        id: "demo_g_aqiqah",
        householdId: h,
        name: "العقيقة والاحتفال العائلي",
        expectedCost: 3500,
        fundedAmount: 500,
        fundingDate: addDays(today, 150),
        spendingDate: addDays(today, 140),
        phase: "after_birth",
        priority: "important",
        visibility: "private",
        ownerUserId: USER_PARTNER,
        createdAt,
      },
    ],
    fundingContributions: [
      { id: "demo_c1", goalId: "demo_g_carseat", householdId: h, amount: 400, date: addDays(today, -30) },
      { id: "demo_c2", goalId: "demo_g_hospital", householdId: h, amount: 3000, date: addDays(today, -60) },
      { id: "demo_c3", goalId: "demo_g_hospital", householdId: h, amount: 3000, date: addDays(today, -28) },
      { id: "demo_c4", goalId: "demo_g_travel", householdId: h, amount: 1500, date: addDays(today, -20) },
      { id: "demo_c5", goalId: "demo_g_aqiqah", householdId: h, amount: 500, date: addDays(today, -10) },
    ],
    recalculations: [
      {
        id: "demo_r1",
        goalId: "demo_g_carseat",
        householdId: h,
        at: `${addDays(today, -30)}T18:00:00.000Z`,
        whatChanged: "أُضيفت مساهمة بقيمة 400",
        why: "أُضيفت مساهمة جديدة، فقلّ المتبقي.",
        previousMonthly: 400,
        newMonthly: 267,
        effectiveFundingDate: addDays(today, 75),
      },
    ],
    travelPlans: [
      {
        id: "demo_tp1",
        householdId: h,
        fromCity: "الدمام",
        toCity: "جدة",
        plannedDate: addDays(today, 100),
        returnDate: addDays(today, 135),
        notes: "الإقامة قرب المستشفى لتقليل وقت الوصول.",
        tasks: [
          { id: "demo_tt1", title: "نقل ملف المتابعة إلى طبيبة الولادة", done: true },
          { id: "demo_tt2", title: "حجز الإقامة", done: false },
          { id: "demo_tt3", title: "التأكد من تغطية التأمين في مدينة الولادة", done: false },
        ],
      },
    ],
    birthPlan: {
      id: "demo_bp1",
      householdId: h,
      hospitalId: "demo_h2",
      doctorId: "demo_dr2",
      insuranceId: "demo_ins1",
      supportPerson: "الشريك والجدة",
      updatedAt: createdAt,
    },
    feedingPreference: null,
    postpartumTasks: [],
    mediaAssets: [],
    notificationPreferences: [],
  };
}

export function demoPostpartumHousehold(today: string): HouseholdData {
  const h = DEMO_HOUSEHOLD_POSTPARTUM;
  const birthDate = addDays(today, -12);
  const dueDate = addDays(birthDate, 5);
  const createdAt = `${addDays(today, -230)}T09:00:00.000Z`;
  const motherRoles = ["mother", "financial_planner"] as const;
  const partnerRoles = ["partner"] as const;

  return {
    household: {
      id: h,
      createdAt,
      settings: {
        productName: appConfig.defaultProductName,
        currencyCode: "SAR",
        financeEnabled: true,
        financeShared: true,
        theme: "system",
      },
    },
    users: [
      { id: `${USER_MOTHER}_pp`, displayName: "جود", createdAt },
      { id: `${USER_PARTNER}_pp`, displayName: "بدر", createdAt },
    ],
    members: [
      { id: `${MEMBER_MOTHER}_pp`, householdId: h, userId: `${USER_MOTHER}_pp`, displayName: "جود", roles: [...motherRoles], permissions: permissionsForRoles([...motherRoles]) },
      { id: `${MEMBER_PARTNER}_pp`, householdId: h, userId: `${USER_PARTNER}_pp`, displayName: "بدر", roles: [...partnerRoles], permissions: permissionsForRoles([...partnerRoles]) },
    ],
    pregnancy: {
      id: "demo_p2",
      householdId: h,
      dueDate,
      followUpCity: "أبها",
      deliveryCity: "أبها",
      mode: "postpartum",
      createdAt,
      dueDateHistory: [],
    },
    baby: { id: "demo_b2", householdId: h, displayName: "ليان", gender: "girl", birthDate, birthTime: "04:20" },
    milestones: [
      { id: "demo_ms_home", householdId: h, type: "family", title: "العودة إلى المنزل", date: addDays(birthDate, 2), origin: "user" },
    ],
    appointments: [
      { id: "demo_pa1", householdId: h, type: "baby_checkup", date: addDays(today, 3), time: "10:00", city: "أبها", preparationTasks: [{ id: "demo_pt1", title: "دفتر التطعيمات", done: false }], status: "upcoming", reminder: true },
      { id: "demo_pa2", householdId: h, type: "postpartum_checkup", date: addDays(today, 28), city: "أبها", preparationTasks: [], status: "upcoming", reminder: true },
    ],
    ultrasounds: [],
    careProviders: [
      { id: "demo_pdr1", householdId: h, kind: "follow_up", name: "د. عهود القحطاني", specialty: "نساء وولادة", city: "أبها" },
      { id: "demo_pdr2", householdId: h, kind: "specialist", name: "د. ماجد الشهري", specialty: "أطفال وحديثي الولادة", city: "أبها" },
    ],
    hospitals: [
      { id: "demo_ph1", householdId: h, name: "مستشفى السلام (اسم تجريبي)", city: "أبها", purposes: ["follow_up", "delivery"], insuranceBelievedCovered: true, insuranceLastVerifiedAt: addDays(today, -20) },
    ],
    insurance: [],
    verificationTasks: [],
    preparationItems: [
      { id: "demo_ppi1", householdId: h, category: "mother_postpartum", title: "مستلزمات الأم بعد الولادة", status: "owned", size: "task", inHospitalBag: false, updatedAt: createdAt },
      { id: "demo_ppi2", householdId: h, category: "care", title: "حفاضات مقاس 1", status: "need_to_buy", size: "task", inHospitalBag: false, updatedAt: createdAt },
    ],
    fundingGoals: [
      { id: "demo_pg1", householdId: h, name: "العقيقة", expectedCost: 3000, actualCost: 3200, fundedAmount: 3200, fundingDate: addDays(today, -5), spendingDate: addDays(today, 2), phase: "after_birth", priority: "important", visibility: "shared", ownerUserId: `${USER_MOTHER}_pp`, createdAt },
    ],
    fundingContributions: [
      { id: "demo_pc1", goalId: "demo_pg1", householdId: h, amount: 3200, date: addDays(today, -6) },
    ],
    recalculations: [],
    travelPlans: [],
    birthPlan: null,
    feedingPreference: { id: "demo_fp1", householdId: h, methods: ["breastfeeding", "pumped"], updatedAt: `${birthDate}T12:00:00.000Z` },
    postpartumTasks: [
      { id: "demo_ppt1", householdId: h, kind: "feeding", title: "تسجيل مواعيد الرضاعة اليوم", done: false, createdAt },
      { id: "demo_ppt2", householdId: h, kind: "medical", title: "فحص الصغيرة — بعد ثلاثة أيام", dueDate: addDays(today, 3), done: false, createdAt },
      { id: "demo_ppt3", householdId: h, kind: "mother_care", title: "مشي قصير داخل المنزل", done: true, createdAt },
      { id: "demo_ppt4", householdId: h, kind: "home", title: "غسيل ملابس الصغيرة بمنظّف لطيف", done: false, createdAt },
    ],
    mediaAssets: [],
    notificationPreferences: [],
  };
}

export function demoHouseholds(today: string): HouseholdData[] {
  return [demoPregnancyHousehold(today), demoPostpartumHousehold(today)];
}

export const DEMO_DEFAULT_MEMBER: Record<string, string> = {
  [DEMO_HOUSEHOLD_PREGNANCY]: MEMBER_MOTHER,
  [DEMO_HOUSEHOLD_POSTPARTUM]: `${MEMBER_MOTHER}_pp`,
};
