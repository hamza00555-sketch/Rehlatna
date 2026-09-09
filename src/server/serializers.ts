import type {
  Baby,
  FundingContribution,
  FundingGoal,
  HouseholdData,
  HouseholdMember,
  MediaAsset,
  PreparationItem,
  RecalculationExplanation,
} from "@/domain/types";
import { can, type Viewer } from "@/domain/permissions";
import { computeGoal, computeTotals, totalsByPhase, type GoalComputed } from "@/domain/finance";

/**
 * Permission-filtered serializers — THE privacy boundary. Anything that
 * reaches a client goes through here with the requesting `Viewer`.
 *
 * Preparation payloads never contain money: `PreparationItem` has no such
 * field, and the only link to finance (`linkedGoalId`) is added exclusively
 * for viewers holding finance:view.
 */

// --- Preparation -------------------------------------------------------------

export interface PreparationItemView {
  id: string;
  title: string;
  category: PreparationItem["category"];
  status: PreparationItem["status"];
  size: PreparationItem["size"];
  mediaAssetId?: string;
  notes?: string;
  inHospitalBag: boolean;
  updatedAt: string;
  /** Present only for finance viewers. */
  linkedGoalId?: string;
  /** Resolved from `mediaAssetId`; absent → neutral placeholder. */
  mediaSrc?: string;
  focalPoint?: { x: number; y: number };
}

export function serializePreparationItem(
  item: PreparationItem,
  viewer: Viewer,
  goals: FundingGoal[],
  mediaAssets: MediaAsset[] = [],
): PreparationItemView {
  const asset = item.mediaAssetId ? mediaAssets.find((a) => a.id === item.mediaAssetId) : undefined;
  const view: PreparationItemView = {
    id: item.id,
    title: item.title,
    category: item.category,
    status: item.status,
    size: item.size,
    mediaAssetId: item.mediaAssetId,
    notes: item.notes,
    inHospitalBag: item.inHospitalBag,
    updatedAt: item.updatedAt,
    mediaSrc: asset?.src,
    focalPoint: asset?.focalPoint,
  };
  if (can(viewer, "finance:view")) {
    const linked = goals.find((g) => g.preparationItemId === item.id && goalVisibleTo(g, viewer, false));
    if (linked) view.linkedGoalId = linked.id;
  }
  return view;
}

// --- Finance -----------------------------------------------------------------

export interface FundingGoalView extends GoalComputed {
  id: string;
  name: string;
  expectedCost?: number;
  actualCost?: number;
  fundedAmount: number;
  fundingDate: string;
  spendingDate?: string;
  phase: FundingGoal["phase"];
  priority: FundingGoal["priority"];
  notes?: string;
  preparationItemId?: string;
  visibility: FundingGoal["visibility"];
  ownerUserId: string;
  isOwner: boolean;
}

/**
 * A goal is visible when the viewer holds finance:view AND either the goal is
 * shared, the household shares finance, or the viewer owns the goal.
 */
export function goalVisibleTo(goal: FundingGoal, viewer: Viewer, financeShared: boolean): boolean {
  if (!can(viewer, "finance:view")) return false;
  if (goal.ownerUserId === viewer.userId) return true;
  return financeShared || goal.visibility === "shared";
}

export function visibleGoals(data: HouseholdData, viewer: Viewer): FundingGoal[] {
  if (!data.household.settings.financeEnabled) return [];
  return data.fundingGoals.filter((g) => goalVisibleTo(g, viewer, data.household.settings.financeShared));
}

export function serializeFundingGoal(goal: FundingGoal, viewer: Viewer, today: string): FundingGoalView {
  return {
    id: goal.id,
    name: goal.name,
    expectedCost: goal.expectedCost,
    actualCost: goal.actualCost,
    fundedAmount: goal.fundedAmount,
    fundingDate: goal.fundingDate,
    spendingDate: goal.spendingDate,
    phase: goal.phase,
    priority: goal.priority,
    notes: goal.notes,
    preparationItemId: goal.preparationItemId,
    visibility: goal.visibility,
    ownerUserId: goal.ownerUserId,
    isOwner: goal.ownerUserId === viewer.userId,
    ...computeGoal(goal, today),
  };
}

export interface FinanceOverviewView {
  currencyCode: string;
  totals: ReturnType<typeof computeTotals>;
  byPhase: ReturnType<typeof totalsByPhase>;
  goals: FundingGoalView[];
  canEdit: boolean;
  latestExplanation: RecalculationExplanation | null;
}

/** Returns null — not an empty object — when the viewer may not see finance. */
export function serializeFinanceOverview(
  data: HouseholdData,
  viewer: Viewer,
  today: string,
): FinanceOverviewView | null {
  if (!data.household.settings.financeEnabled || !can(viewer, "finance:view")) return null;
  const goals = visibleGoals(data, viewer);
  const goalIds = new Set(goals.map((g) => g.id));
  const explanations = data.recalculations
    .filter((r) => goalIds.has(r.goalId))
    .sort((a, b) => (a.at < b.at ? 1 : -1));
  return {
    currencyCode: data.household.settings.currencyCode,
    totals: computeTotals(goals, today),
    byPhase: totalsByPhase(goals),
    goals: goals.map((g) => serializeFundingGoal(g, viewer, today)),
    canEdit: can(viewer, "finance:edit"),
    latestExplanation: explanations[0] ?? null,
  };
}

export function serializeContributions(
  goal: FundingGoal,
  data: HouseholdData,
  viewer: Viewer,
): FundingContribution[] {
  if (!goalVisibleTo(goal, viewer, data.household.settings.financeShared)) return [];
  return data.fundingContributions
    .filter((c) => c.goalId === goal.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function serializeExplanations(
  goal: FundingGoal,
  data: HouseholdData,
  viewer: Viewer,
): RecalculationExplanation[] {
  if (!goalVisibleTo(goal, viewer, data.household.settings.financeShared)) return [];
  return data.recalculations.filter((r) => r.goalId === goal.id).sort((a, b) => (a.at < b.at ? 1 : -1));
}

// --- Household ---------------------------------------------------------------

export interface MemberView {
  id: string;
  displayName: string;
  roles: HouseholdMember["roles"];
  permissions: HouseholdMember["permissions"];
  isViewer: boolean;
}

export function serializeMember(member: HouseholdMember, viewer: Viewer): MemberView {
  return {
    id: member.id,
    displayName: member.displayName,
    roles: member.roles,
    /** Permissions of others are visible only to household managers. */
    permissions: member.id === viewer.memberId || can(viewer, "household:manage") ? member.permissions : [],
    isViewer: member.id === viewer.memberId,
  };
}

export interface BabyView {
  displayName: string | null;
  gender: Baby["gender"];
  birthDate?: string;
  birthTime?: string;
  hasPersonalMedia: boolean;
}

export function serializeBaby(baby: Baby | null): BabyView | null {
  if (!baby) return null;
  return {
    displayName: baby.displayName,
    gender: baby.gender,
    birthDate: baby.birthDate,
    birthTime: baby.birthTime,
    hasPersonalMedia: Boolean(baby.personalMediaAssetId),
  };
}

/** Strips every finance record from a household snapshot for non-finance viewers. */
export function stripFinance(data: HouseholdData, viewer: Viewer): HouseholdData {
  if (can(viewer, "finance:view")) return data;
  return { ...data, fundingGoals: [], fundingContributions: [], recalculations: [] };
}

/**
 * The household as the viewer is allowed to see it — the export boundary.
 * Every domain is gated by the same permission that gates its screen, goals
 * follow `visibleGoals` (private goals of other owners stay private even
 * for finance viewers), and other members' permissions are shown only to
 * household managers, exactly as `serializeMember` does.
 */
export function exportHouseholdView(data: HouseholdData, viewer: Viewer): HouseholdData {
  const manages = can(viewer, "household:manage");
  const journey = can(viewer, "journey:view");
  const appointments = can(viewer, "appointments:view");
  const care = can(viewer, "care:view");
  const preparation = can(viewer, "preparation:view");
  const goals = visibleGoals(data, viewer);
  const goalIds = new Set(goals.map((g) => g.id));
  return {
    ...data,
    members: data.members.map((mm) => (manages || mm.id === viewer.memberId ? mm : { ...mm, permissions: [] })),
    pregnancy: journey ? data.pregnancy : null,
    baby: journey ? data.baby : null,
    milestones: journey ? data.milestones : [],
    ultrasounds: journey ? data.ultrasounds : [],
    birthPlan: journey ? data.birthPlan : null,
    feedingPreference: journey ? data.feedingPreference : null,
    postpartumTasks: journey ? data.postpartumTasks : [],
    appointments: appointments ? data.appointments : [],
    careProviders: care ? data.careProviders : [],
    hospitals: care ? data.hospitals : [],
    insurance: care ? data.insurance : [],
    verificationTasks: care ? data.verificationTasks : [],
    preparationItems: preparation ? data.preparationItems : [],
    travelPlans: preparation ? data.travelPlans : [],
    fundingGoals: goals,
    fundingContributions: data.fundingContributions.filter((c) => goalIds.has(c.goalId)),
    recalculations: data.recalculations.filter((r) => goalIds.has(r.goalId)),
    notificationPreferences: data.notificationPreferences.filter((n) => n.memberId === viewer.memberId),
  };
}
