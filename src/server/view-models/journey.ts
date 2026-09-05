import type { JourneyMilestone, MilestoneType } from "@/domain/types";
import { appointmentMilestones, generateSystemMilestones, milestoneStates, nextMilestone, sortMilestones, type MilestoneState } from "@/domain/journey";
import { daysBetween } from "@/domain/dates";
import { pregnancyProgress } from "@/domain/pregnancy";
import { m } from "@/i18n";
import type { RequestContext } from "../session";

export interface JourneyItemVM {
  id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  type: MilestoneType;
  state: MilestoneState;
  origin: "system" | "user";
  href: string;
  /** Gestational week the milestone lands on (pregnancy items only). */
  week?: number;
  daysFromToday: number;
  appointmentId?: string;
  key?: string;
}

export interface JourneyViewModel {
  items: JourneyItemVM[];
  current: JourneyItemVM | null;
  next: JourneyItemVM | null;
  sections: { pregnancy: JourneyItemVM[]; birth: JourneyItemVM[]; postpartum: JourneyItemVM[] };
}

export function resolveMilestoneTitle(ms: JourneyMilestone): { title: string; description?: string } {
  if (ms.origin === "system" && ms.key) {
    const copy = m.journey.systemMilestones[ms.key];
    if (copy) return { title: copy.title, description: copy.description || undefined };
  }
  if (ms.appointmentId) {
    return { title: m.appointments.types[ms.title] ?? ms.title, description: ms.description };
  }
  return { title: ms.title, description: ms.description };
}

export function allMilestones(ctx: RequestContext): JourneyMilestone[] {
  const { data } = ctx;
  if (!data.pregnancy) return [];
  return sortMilestones([
    ...generateSystemMilestones(data.pregnancy, data.baby),
    ...appointmentMilestones(data.appointments),
    ...data.milestones,
  ]);
}

export function buildJourneyViewModel(ctx: RequestContext): JourneyViewModel {
  const { data, today } = ctx;
  const pregnancy = data.pregnancy;
  const milestones = allMilestones(ctx);
  const states = milestoneStates(milestones, today);
  const next = nextMilestone(milestones, today);
  const birthDate = data.baby?.birthDate;

  const items: JourneyItemVM[] = milestones.map((ms) => {
    const { title, description } = resolveMilestoneTitle(ms);
    const isPostpartum = Boolean(birthDate && ms.date > birthDate) || ms.type === "postpartum";
    return {
      id: ms.id,
      title,
      description,
      date: ms.date,
      endDate: ms.endDate,
      type: ms.type,
      state: states.get(ms.id) ?? "future",
      origin: ms.origin,
      href: ms.appointmentId ? `/journey/appointments/${ms.appointmentId}` : `/journey/milestone/${encodeURIComponent(ms.id)}`,
      week: pregnancy && !isPostpartum ? pregnancyProgress(pregnancy.dueDate, ms.date).week : undefined,
      daysFromToday: daysBetween(today, ms.date),
      appointmentId: ms.appointmentId,
      key: ms.key,
    };
  });

  const current = items.find((i) => i.state === "current") ?? null;
  const sections = {
    pregnancy: items.filter((i) => i.type !== "birth" && i.type !== "postpartum" && !(birthDate && i.date > birthDate)),
    birth: items.filter((i) => i.type === "birth"),
    postpartum: items.filter((i) => i.type === "postpartum" || (birthDate && i.date > birthDate && i.type !== "birth")),
  };

  return { items, current, next: next ? items.find((i) => i.id === next.id) ?? null : null, sections };
}
