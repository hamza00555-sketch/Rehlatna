import type { HouseholdData, HouseholdMember, Pregnancy, User } from "@/domain/types";
import { permissionsForRoles } from "@/domain/permissions";
import type { ResolvedDating } from "@/domain/pregnancy";
import { appConfig } from "@/config/app";
import type { OnboardingInput } from "@/schemas";

/**
 * Builds a REAL household from onboarding input. This is the respectful
 * empty/setup state every new family starts from — no demo content.
 * `dating` is the server-resolved due date (never the client's raw input).
 */
export function createHouseholdFromOnboarding(
  input: OnboardingInput,
  dating: ResolvedDating,
  ids: { household: string; users: [string, string]; members: [string, string]; pregnancy: string; baby: string },
  now: string,
): HouseholdData {
  const householdId = ids.household;

  const creatorRoles = [...input.creator.roles];
  const partnerRoles = input.partner ? [...input.partner.roles] : [];
  if (input.finance.enabled) {
    if (input.finance.owner === "partner" && input.partner) {
      if (!partnerRoles.includes("financial_planner")) partnerRoles.push("financial_planner");
    } else if (!creatorRoles.includes("financial_planner")) {
      creatorRoles.push("financial_planner");
    }
  }

  const users: User[] = [{ id: ids.users[0], displayName: input.creator.displayName, createdAt: now }];
  const members: HouseholdMember[] = [
    {
      id: ids.members[0],
      householdId,
      userId: ids.users[0],
      displayName: input.creator.displayName,
      roles: creatorRoles,
      permissions: permissionsForRoles(creatorRoles),
    },
  ];
  if (input.partner) {
    users.push({ id: ids.users[1], displayName: input.partner.displayName, createdAt: now });
    members.push({
      id: ids.members[1],
      householdId,
      userId: ids.users[1],
      displayName: input.partner.displayName,
      roles: partnerRoles,
      permissions: permissionsForRoles(partnerRoles),
    });
  }

  const pregnancy: Pregnancy = {
    id: ids.pregnancy,
    householdId,
    dueDate: dating.dueDate,
    datingMethod: dating.datingMethod,
    lastPeriodStartDate: dating.lastPeriodStartDate,
    followUpCity: input.followUpCity,
    deliveryCity: input.deliveryCity,
    mode: "pregnancy",
    createdAt: now,
    dueDateHistory: [],
  };

  return {
    household: {
      id: householdId,
      createdAt: now,
      settings: {
        productName: input.productName?.trim() || appConfig.defaultProductName,
        currencyCode: appConfig.defaultCurrencyCode,
        financeEnabled: input.finance.enabled,
        financeShared: input.finance.shared,
        theme: "system",
      },
    },
    users,
    members,
    pregnancy,
    baby: { id: ids.baby, householdId, displayName: null, gender: "unknown" },
    milestones: [],
    appointments: [],
    ultrasounds: [],
    careProviders: [],
    hospitals: [],
    insurance: [],
    verificationTasks: [],
    preparationItems: [],
    fundingGoals: [],
    fundingContributions: [],
    recalculations: [],
    travelPlans: [],
    birthPlan: null,
    feedingPreference: null,
    postpartumTasks: [],
    mediaAssets: [],
    notificationPreferences: members.map((mm) => ({
      id: `np_${mm.id}`,
      householdId,
      memberId: mm.id,
      appointments: true,
      weeklyUpdate: true,
      preparation: true,
      finance: false,
    })),
  };
}
