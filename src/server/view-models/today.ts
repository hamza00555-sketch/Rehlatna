import type { Appointment, DueDateChange, WeeklyBabyMedia } from "@/domain/types";
import { daysBetween } from "@/domain/dates";
import { postpartumAge, pregnancyProgress, TOTAL_WEEKS, type PostpartumAge, type PregnancyProgress } from "@/domain/pregnancy";
import { can } from "@/domain/permissions";
import { weeklyMedia } from "@/media/weekly";
import { m } from "@/i18n";
import type { RequestContext } from "../session";
import { serializeBaby, serializeFinanceOverview, type BabyView } from "../serializers";
import { buildJourneyViewModel } from "./journey";
import type { FinanceTotals } from "@/domain/finance";

/**
 * Today view model. Order is fixed by the brief: Baby Hero → one next action
 * → asymmetric bento. Finance appears only when the serializer allows it and
 * never as the first or largest module.
 */

export interface AppointmentSummary {
  id: string;
  type: Appointment["type"];
  date: string;
  time?: string;
  city?: string;
  doctorName?: string;
  hospitalName?: string;
  daysUntil: number;
  openTasks: number;
}

export type BentoSpan = "1x1" | "2x1" | "1x2" | "2x2" | "full";

export type BentoModule =
  | { kind: "appointment"; span: BentoSpan; appointment: AppointmentSummary }
  | { kind: "journey"; span: BentoSpan; currentTitle: string; nextTitle: string | null; nextInDays: number | null }
  | { kind: "preparation"; span: BentoSpan; ready: number; total: number; needed: number }
  | { kind: "week"; span: BentoSpan; week: number; points: string[] }
  | { kind: "finance"; span: BentoSpan; totals: FinanceTotals; currencyCode: string }
  | { kind: "travel"; span: BentoSpan; fromCity: string; toCity: string; plannedDate?: string; hasPlan: boolean }
  | { kind: "birthPlan"; span: BentoSpan; chosen: number; total: number };

export interface NextAction {
  title: string;
  body?: string;
  href: string;
  cta: string;
}

export interface PregnancyHeroVM {
  progress: PregnancyProgress;
  totalWeeks: number;
  dueDate: string;
  media: WeeklyBabyMedia;
  recentDueDateChange: DueDateChange | null;
}

export interface PostpartumHeroVM {
  age: PostpartumAge;
  birthDate: string;
  hasPersonalMedia: boolean;
  tasks: { id: string; title: string; kind: string; done: boolean; dueDate?: string }[];
}

export interface TodayViewModel {
  mode: "pregnancy" | "postpartum";
  productName: string;
  todayIso: string;
  member: { displayName: string; initials: string };
  baby: BabyView | null;
  pregnancy: PregnancyHeroVM | null;
  postpartum: PostpartumHeroVM | null;
  nextAction: NextAction | null;
  bento: BentoModule[];
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("");
}

export function upcomingAppointments(ctx: RequestContext): AppointmentSummary[] {
  const { data, today } = ctx;
  return data.appointments
    .filter((a) => a.status === "upcoming" && a.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((a) => ({
      id: a.id,
      type: a.type,
      date: a.date,
      time: a.time,
      city: a.city,
      doctorName: data.careProviders.find((d) => d.id === a.doctorId)?.name,
      hospitalName: data.hospitals.find((h) => h.id === a.hospitalId)?.name,
      daysUntil: daysBetween(today, a.date),
      openTasks: a.preparationTasks.filter((t) => !t.done).length,
    }));
}

export function buildTodayViewModel(ctx: RequestContext): TodayViewModel {
  const { data, today, member, viewer } = ctx;
  const pregnancy = data.pregnancy!;
  const baby = data.baby;
  const isPostpartum = pregnancy.mode === "postpartum" && Boolean(baby?.birthDate);
  const progress = pregnancyProgress(pregnancy.dueDate, today);
  const journey = buildJourneyViewModel(ctx);
  const upcoming = upcomingAppointments(ctx);
  const nextAppointment = upcoming[0] ?? null;

  const relevantItems = data.preparationItems.filter((i) => i.status !== "not_required");
  const ready = relevantItems.filter((i) => i.status === "owned").length;
  const needed = data.preparationItems.filter((i) => i.status === "need_to_buy").length;

  const citiesDiffer = pregnancy.followUpCity.trim() !== pregnancy.deliveryCity.trim();
  const travelPlan = data.travelPlans[0] ?? null;
  const finance = serializeFinanceOverview(data, viewer, today);

  // --- Next action: exactly one, chosen by relevance -------------------------
  let nextAction: NextAction | null = null;
  if (!isPostpartum) {
    if (nextAppointment && nextAppointment.openTasks > 0 && nextAppointment.daysUntil <= 3) {
      nextAction = {
        title: m.appointments.preparationTasks,
        body: `${m.appointments.types[nextAppointment.type]} · ${m.common.inDays(nextAppointment.daysUntil) }`,
        href: `/journey/appointments/${nextAppointment.id}`,
        cta: m.common.open,
      };
    } else if (upcoming.length === 0 && can(viewer, "appointments:edit")) {
      nextAction = { title: m.today.addAppointment, href: "/journey/appointments/new", cta: m.appointments.add };
    } else if (baby && baby.gender === "unknown" && progress.week >= 18 && can(viewer, "journey:edit")) {
      nextAction = { title: m.gender.title, body: m.gender.help, href: "/journey/gender", cta: m.common.open };
    } else if (data.preparationItems.length === 0 && can(viewer, "preparation:edit")) {
      nextAction = { title: m.today.preparationEmpty, body: m.preparation.emptyBody, href: "/preparation", cta: m.common.open };
    } else if (progress.week >= 34 && data.preparationItems.some((i) => i.inHospitalBag && i.status !== "owned")) {
      nextAction = { title: m.preparation.hospitalBag, body: m.preparation.hospitalBagIntro, href: "/preparation/hospital-bag", cta: m.common.open };
    } else if (citiesDiffer && !travelPlan && progress.week >= 28 && can(viewer, "care:edit")) {
      nextAction = { title: m.today.travelPrompt, body: m.travel.intro, href: "/more/travel", cta: m.travel.create };
    }
  } else {
    const openTask = data.postpartumTasks.find((t) => !t.done);
    if (nextAppointment) {
      nextAction = {
        title: m.today.nextAppointment,
        body: `${m.appointments.types[nextAppointment.type]} · ${nextAppointment.daysUntil === 0 ? m.common.today : m.common.inDays(nextAppointment.daysUntil)}`,
        href: `/journey/appointments/${nextAppointment.id}`,
        cta: m.common.open,
      };
    } else if (!data.feedingPreference && can(viewer, "care:edit")) {
      nextAction = { title: m.postpartum.feedingPreferences, body: m.postpartum.feedingIntro, href: "/more/feeding", cta: m.common.open };
    } else if (openTask) {
      nextAction = { title: openTask.title, href: "/today", cta: m.common.done };
    }
  }

  // --- Bento: asymmetric, priority-adapted ----------------------------------
  const bento: BentoModule[] = [];
  if (nextAppointment) {
    bento.push({ kind: "appointment", span: nextAppointment.daysUntil <= 2 ? "2x1" : "1x1", appointment: nextAppointment });
  }
  bento.push({
    kind: "journey",
    span: "1x1",
    currentTitle: journey.current?.title ?? m.journey.title,
    nextTitle: journey.next?.title ?? null,
    nextInDays: journey.next ? daysBetween(today, journey.next.date) : null,
  });
  if (!isPostpartum) {
    bento.push({ kind: "week", span: nextAppointment && nextAppointment.daysUntil <= 2 ? "1x1" : "2x1", week: progress.week, points: weeklyMedia(progress.mediaWeek).developmentPoints.slice(0, 3) });
  }
  bento.push({ kind: "preparation", span: "1x1", ready, total: relevantItems.length, needed });
  if (finance) {
    bento.push({ kind: "finance", span: "2x1", totals: finance.totals, currencyCode: finance.currencyCode });
  }
  if (!isPostpartum && citiesDiffer && progress.week >= 24) {
    bento.push({ kind: "travel", span: "1x1", fromCity: pregnancy.followUpCity, toCity: pregnancy.deliveryCity, plannedDate: travelPlan?.plannedDate, hasPlan: Boolean(travelPlan) });
  }
  if (!isPostpartum && progress.week >= 30) {
    const bp = data.birthPlan;
    const chosen = bp ? [bp.hospitalId, bp.doctorId, bp.insuranceId, bp.supportPerson].filter(Boolean).length : 0;
    bento.push({ kind: "birthPlan", span: "1x1", chosen, total: 4 });
  }

  const recentChange = pregnancy.dueDateHistory.at(-1);
  const recentDueDateChange = recentChange && daysBetween(recentChange.changedAt.slice(0, 10), today) <= 7 ? recentChange : null;

  return {
    mode: isPostpartum ? "postpartum" : "pregnancy",
    productName: data.household.settings.productName,
    todayIso: today,
    member: { displayName: member.displayName, initials: initialsOf(member.displayName) },
    baby: serializeBaby(baby),
    pregnancy: isPostpartum
      ? null
      : { progress, totalWeeks: TOTAL_WEEKS, dueDate: pregnancy.dueDate, media: weeklyMedia(progress.mediaWeek), recentDueDateChange },
    postpartum:
      isPostpartum && baby?.birthDate
        ? {
            age: postpartumAge(baby.birthDate, today),
            birthDate: baby.birthDate,
            hasPersonalMedia: Boolean(baby.personalMediaAssetId),
            tasks: data.postpartumTasks
              .filter((t) => !t.done || t.dueDate === today)
              .slice(0, 5)
              .map((t) => ({ id: t.id, title: t.title, kind: t.kind, done: t.done, dueDate: t.dueDate })),
          }
        : null,
    nextAction,
    bento,
  };
}
