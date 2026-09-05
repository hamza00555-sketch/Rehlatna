import type { PreparationCategoryKey, PreparationStatus } from "@/domain/types";
import { can } from "@/domain/permissions";
import { m } from "@/i18n";
import type { RequestContext } from "../session";
import { serializePreparationItem, type PreparationItemView } from "../serializers";

export type PreparationFilter = "all" | "ready" | "needed" | "future";

export const CATEGORY_ORDER: PreparationCategoryKey[] = [
  "sleep",
  "mobility",
  "feeding",
  "clothing",
  "care",
  "hospital",
  "travel",
  "mother_postpartum",
  "other",
];

export interface CategorySummary {
  key: PreparationCategoryKey;
  title: string;
  total: number;
  ready: number;
  needed: number;
  undecided: number;
}

export interface PreparationViewModel {
  filter: PreparationFilter;
  items: PreparationItemView[];
  objects: PreparationItemView[];
  tasks: PreparationItemView[];
  categories: CategorySummary[];
  readiness: { ready: number; total: number; needed: number };
  hospitalBag: PreparationItemView[];
  canEdit: boolean;
  /** finance:edit — may create funding goals from needed items. */
  canPlanFinance: boolean;
  isEmpty: boolean;
}

export const FILTER_STATUS: Record<Exclude<PreparationFilter, "all">, PreparationStatus> = {
  ready: "owned",
  needed: "need_to_buy",
  future: "undecided",
};

export function parseFilter(value: string | undefined): PreparationFilter {
  return value === "ready" || value === "needed" || value === "future" ? value : "all";
}

/**
 * Shared preparation view. Items pass through the viewer-gated serializer,
 * so no member — planner or not — receives a price here.
 */
export function buildPreparationViewModel(ctx: RequestContext, filter: PreparationFilter = "all", category?: PreparationCategoryKey): PreparationViewModel {
  const { data, viewer } = ctx;
  const all = data.preparationItems
    .filter((i) => !category || i.category === category)
    .map((i) => serializePreparationItem(i, viewer, data.fundingGoals))
    .sort((a, b) => (a.status === b.status ? a.title.localeCompare(b.title, "ar") : STATUS_ORDER[a.status] - STATUS_ORDER[b.status]));

  const items = filter === "all" ? all : all.filter((i) => i.status === FILTER_STATUS[filter]);
  const relevant = all.filter((i) => i.status !== "not_required");

  const categories: CategorySummary[] = CATEGORY_ORDER.map((key) => {
    const inCat = all.filter((i) => i.category === key);
    return {
      key,
      title: m.preparation.categories[key]!,
      total: inCat.filter((i) => i.status !== "not_required").length,
      ready: inCat.filter((i) => i.status === "owned").length,
      needed: inCat.filter((i) => i.status === "need_to_buy").length,
      undecided: inCat.filter((i) => i.status === "undecided").length,
    };
  }).filter((c) => c.total > 0 || c.undecided > 0);

  return {
    filter,
    items,
    objects: items.filter((i) => i.size === "object"),
    tasks: items.filter((i) => i.size === "task"),
    categories,
    readiness: {
      ready: relevant.filter((i) => i.status === "owned").length,
      total: relevant.length,
      needed: relevant.filter((i) => i.status === "need_to_buy").length,
    },
    hospitalBag: all.filter((i) => i.inHospitalBag),
    canEdit: can(viewer, "preparation:edit"),
    canPlanFinance: data.household.settings.financeEnabled && can(viewer, "finance:edit"),
    isEmpty: data.preparationItems.length === 0,
  };
}

const STATUS_ORDER: Record<PreparationStatus, number> = {
  need_to_buy: 0,
  undecided: 1,
  owned: 2,
  not_required: 3,
};
