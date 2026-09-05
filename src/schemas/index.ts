import { z } from "zod";
import { isValidIsoDate } from "@/domain/dates";

/**
 * Runtime validation at API boundaries. Every route handler parses its body
 * with one of these before touching the store.
 */

const isoDate = z.string().refine(isValidIsoDate, { message: "invalid_date" });
const shortText = z.string().trim().min(1).max(120);
const longText = z.string().trim().max(2000);
const optionalText = z
  .string()
  .trim()
  .max(2000)
  .transform((v) => (v === "" ? undefined : v))
  .optional();
const money = z.number().finite().min(0).max(1_000_000_000);
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  .optional()
  .or(z.literal("").transform(() => undefined));

export const householdRoleSchema = z.enum(["mother", "partner", "financial_planner", "family_supporter"]);
export const permissionSchema = z.enum([
  "journey:view",
  "journey:edit",
  "appointments:view",
  "appointments:edit",
  "preparation:view",
  "preparation:edit",
  "care:view",
  "care:edit",
  "finance:view",
  "finance:edit",
  "household:manage",
]);
export const genderSchema = z.enum(["boy", "girl", "unknown", "undisclosed"]);

// --- Onboarding --------------------------------------------------------------

export const onboardingSchema = z.object({
  dueDate: isoDate,
  creator: z.object({
    displayName: shortText,
    roles: z.array(householdRoleSchema).min(1),
  }),
  partner: z
    .object({
      displayName: shortText,
      roles: z.array(householdRoleSchema).min(1),
    })
    .optional(),
  finance: z.object({
    enabled: z.boolean(),
    /** "creator" | "partner" — who receives the financial_planner role. */
    owner: z.enum(["creator", "partner"]).optional(),
    shared: z.boolean(),
  }),
  followUpCity: shortText,
  deliveryCity: shortText,
  productName: z.string().trim().max(40).optional(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

// --- Pregnancy / baby --------------------------------------------------------

export const dueDateUpdateSchema = z.object({ dueDate: isoDate });
export const citiesUpdateSchema = z.object({ followUpCity: shortText, deliveryCity: shortText });
export const genderUpdateSchema = z.object({ gender: genderSchema });
export const babyNameSchema = z.object({ displayName: z.string().trim().max(60).nullable() });

export const birthConfirmSchema = z.object({
  birthDate: isoDate,
  photoNote: z.string().max(200).optional(),
  birthTime: time,
  displayName: z.string().trim().max(60).optional().or(z.literal("").transform(() => undefined)),
  gender: genderSchema.optional(),
  /** Explicit confirmation flag — the transition never happens implicitly. */
  confirmed: z.literal(true),
});

// --- Journey -----------------------------------------------------------------

export const milestoneTypeSchema = z.enum([
  "automatic",
  "manual",
  "medical",
  "family",
  "financial",
  "travel",
  "preparation",
  "birth",
  "postpartum",
]);

export const milestoneCreateSchema = z.object({
  title: shortText,
  description: optionalText,
  date: isoDate,
  type: milestoneTypeSchema.default("manual"),
});

// --- Appointments ------------------------------------------------------------

export const appointmentTypeSchema = z.enum([
  "checkup",
  "ultrasound",
  "lab",
  "specialist",
  "delivery_planning",
  "postpartum_checkup",
  "baby_checkup",
  "other",
]);

export const checklistTaskSchema = z.object({
  id: z.string().optional(),
  title: shortText,
  done: z.boolean().default(false),
});

export const appointmentInputSchema = z.object({
  type: appointmentTypeSchema,
  date: isoDate,
  time,
  doctorId: z.string().optional().or(z.literal("").transform(() => undefined)),
  hospitalId: z.string().optional().or(z.literal("").transform(() => undefined)),
  city: optionalText,
  notes: optionalText,
  preparationTasks: z.array(checklistTaskSchema).default([]),
  reminder: z.boolean().default(false),
});
export const appointmentStatusSchema = z.object({ status: z.enum(["upcoming", "done", "cancelled"]) });

export const ultrasoundInputSchema = z.object({
  appointmentId: z.string().optional(),
  date: isoDate,
  gestationalWeek: z.number().int().min(4).max(42).optional(),
  notes: optionalText,
});

// --- Care --------------------------------------------------------------------

export const careProviderInputSchema = z.object({
  kind: z.enum(["follow_up", "delivery", "specialist", "backup"]),
  name: shortText,
  specialty: optionalText,
  hospitalId: z.string().optional().or(z.literal("").transform(() => undefined)),
  city: optionalText,
  phone: optionalText,
  notes: optionalText,
});

export const hospitalInputSchema = z.object({
  name: shortText,
  city: shortText,
  purposes: z.array(z.enum(["follow_up", "delivery", "emergency"])).min(1),
  phone: optionalText,
  locationUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  notes: optionalText,
  insuranceBelievedCovered: z.boolean().optional(),
});

export const insuranceInputSchema = z.object({
  provider: shortText,
  planName: optionalText,
  coverageNotes: optionalText,
  candidateHospitalIds: z.array(z.string()).default([]),
});

export const verificationTaskInputSchema = z.object({
  subject: shortText,
  relatedHospitalId: z.string().optional(),
  relatedInsuranceId: z.string().optional(),
});

export const markVerifiedSchema = z.object({ verifiedAt: isoDate });

// --- Preparation -------------------------------------------------------------

export const preparationStatusSchema = z.enum(["owned", "need_to_buy", "not_required", "undecided"]);
export const preparationCategorySchema = z.enum([
  "sleep",
  "mobility",
  "feeding",
  "clothing",
  "care",
  "hospital",
  "travel",
  "mother_postpartum",
  "other",
]);

export const preparationItemInputSchema = z.object({
  title: shortText,
  category: preparationCategorySchema,
  status: preparationStatusSchema,
  size: z.enum(["object", "task"]).default("task"),
  notes: optionalText,
  inHospitalBag: z.boolean().default(false),
});

export const preparationStatusUpdateSchema = z.object({ status: preparationStatusSchema });

// --- Finance -----------------------------------------------------------------

export const fundingGoalInputSchema = z.object({
  name: shortText,
  expectedCost: money.optional(),
  actualCost: money.optional(),
  fundedAmount: money.default(0),
  fundingDate: isoDate,
  spendingDate: isoDate.optional().or(z.literal("").transform(() => undefined)),
  phase: z.enum(["before_birth", "at_birth", "after_birth"]),
  priority: z.enum(["essential", "important", "optional"]),
  notes: optionalText,
  preparationItemId: z.string().optional().or(z.literal("").transform(() => undefined)),
  visibility: z.enum(["private", "shared"]).default("private"),
});

/** Updates require an explicit confirmation flag; the server refuses otherwise. */
export const fundingGoalUpdateSchema = fundingGoalInputSchema.partial().extend({
  confirmed: z.literal(true),
});

export const contributionInputSchema = z.object({
  amount: money.min(0.01),
  date: isoDate,
  note: optionalText,
  confirmed: z.literal(true),
});

// --- Travel / birth plan / postpartum ---------------------------------------

export const travelPlanInputSchema = z.object({
  fromCity: shortText,
  toCity: shortText,
  plannedDate: isoDate.optional().or(z.literal("").transform(() => undefined)),
  returnDate: isoDate.optional().or(z.literal("").transform(() => undefined)),
  notes: optionalText,
  tasks: z.array(checklistTaskSchema).default([]),
});

export const birthPlanInputSchema = z.object({
  hospitalId: z.string().optional().or(z.literal("").transform(() => undefined)),
  doctorId: z.string().optional().or(z.literal("").transform(() => undefined)),
  insuranceId: z.string().optional().or(z.literal("").transform(() => undefined)),
  supportPerson: optionalText,
  preferences: optionalText,
});

export const feedingPreferenceSchema = z.object({
  methods: z.array(z.enum(["breastfeeding", "pumped", "formula"])),
  notes: optionalText,
});

export const postpartumTaskInputSchema = z.object({
  kind: z.enum(["feeding", "medical", "mother_care", "home", "other"]),
  title: shortText,
  dueDate: isoDate.optional().or(z.literal("").transform(() => undefined)),
});

export const taskDoneSchema = z.object({ done: z.boolean() });

// --- Household / settings ----------------------------------------------------

export const memberInputSchema = z.object({
  displayName: shortText,
  roles: z.array(householdRoleSchema).min(1),
});

export const memberPermissionsSchema = z.object({
  roles: z.array(householdRoleSchema).min(1),
  permissions: z.array(permissionSchema),
});

export const settingsSchema = z.object({
  productName: z.string().trim().min(1).max(40).optional(),
  currencyCode: z.string().trim().length(3).toUpperCase().optional(),
  financeEnabled: z.boolean().optional(),
  financeShared: z.boolean().optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
  reduceMotion: z.boolean().optional(),
});

export const notificationPreferenceSchema = z.object({
  appointments: z.boolean(),
  weeklyUpdate: z.boolean(),
  preparation: z.boolean(),
  finance: z.boolean(),
});

export const longTextSchema = longText;
