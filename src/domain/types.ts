/**
 * Domain model — normalized, template-first.
 *
 * Nothing here carries a hardcoded family, provider, city or date. All
 * personalized content flows from stored data; demo fixtures live in
 * src/fixtures and never leak into production defaults.
 */

export type Id = string;
/** ISO calendar date, YYYY-MM-DD. */
export type IsoDate = string;
/** ISO 8601 datetime. */
export type IsoDateTime = string;

// ---------------------------------------------------------------------------
// Household, people, roles
// ---------------------------------------------------------------------------

export type HouseholdRole = "mother" | "partner" | "financial_planner" | "family_supporter";

export type Permission =
  | "journey:view"
  | "journey:edit"
  | "appointments:view"
  | "appointments:edit"
  | "preparation:view"
  | "preparation:edit"
  | "care:view"
  | "care:edit"
  | "finance:view"
  | "finance:edit"
  | "household:manage";

export interface User {
  id: Id;
  displayName: string;
  createdAt: IsoDateTime;
}

export interface HouseholdMember {
  id: Id;
  householdId: Id;
  userId: Id;
  displayName: string;
  /** A member may hold several roles (e.g. partner + financial_planner). */
  roles: HouseholdRole[];
  /** Effective grants — derived from roles at creation, then editable. */
  permissions: Permission[];
  photoAssetId?: Id;
}

export interface HouseholdSettings {
  /** Configurable product name — components never hardcode a brand. */
  productName: string;
  /** ISO 4217 code for display formatting only. */
  currencyCode: string;
  /** Whether the optional financial layer exists for this household. */
  financeEnabled: boolean;
  /** true → every member holding finance:view may see it; false → owner-private. */
  financeShared: boolean;
  theme: "system" | "light" | "dark";
  /** Household-level reduced-motion preference (in addition to the OS setting). */
  reduceMotion?: boolean;
}

export interface Household {
  id: Id;
  createdAt: IsoDateTime;
  settings: HouseholdSettings;
}

// ---------------------------------------------------------------------------
// Pregnancy lifecycle
// ---------------------------------------------------------------------------

export type JourneyMode = "setup" | "pregnancy" | "birth_transition" | "postpartum";

export type BabyGender = "boy" | "girl" | "unknown" | "undisclosed";

export interface DueDateChange {
  previous: IsoDate;
  next: IsoDate;
  changedAt: IsoDateTime;
}

export interface Pregnancy {
  id: Id;
  householdId: Id;
  dueDate: IsoDate;
  /** Where routine follow-up happens. Independent from deliveryCity. */
  followUpCity: string;
  /** Where delivery is planned. Independent from followUpCity. */
  deliveryCity: string;
  mode: JourneyMode;
  createdAt: IsoDateTime;
  /** Due-date edits are never silent — each one is recorded. */
  dueDateHistory: DueDateChange[];
}

export interface Baby {
  id: Id;
  householdId: Id;
  /** null until the family chooses to record a name. */
  displayName: string | null;
  gender: BabyGender;
  /** Present only after explicit birth confirmation. */
  birthDate?: IsoDate;
  birthTime?: string;
  /** Family-supplied photo for the postpartum hero. */
  personalMediaAssetId?: Id;
}

// ---------------------------------------------------------------------------
// Journey
// ---------------------------------------------------------------------------

export type MilestoneType =
  | "automatic"
  | "manual"
  | "medical"
  | "family"
  | "financial"
  | "travel"
  | "preparation"
  | "birth"
  | "postpartum";

export type SystemMilestoneKey =
  | "setup"
  | "first_trimester_end"
  | "second_trimester_begin"
  | "third_trimester_begin"
  | "hospital_bag"
  | "due_window"
  | "due_date"
  | "birth"
  | "forty_days"
  | "month_1"
  | "month_2"
  | "month_3";

export interface JourneyMilestone {
  id: Id;
  householdId: Id;
  type: MilestoneType;
  /** Present for system-generated milestones; the UI resolves copy by key. */
  key?: SystemMilestoneKey;
  title: string;
  description?: string;
  date: IsoDate;
  /** Window milestones (e.g. the expected due window) carry an end date. */
  endDate?: IsoDate;
  appointmentId?: Id;
  /** System milestones are regenerated; user milestones are preserved. */
  origin: "system" | "user";
}

// ---------------------------------------------------------------------------
// Appointments and care
// ---------------------------------------------------------------------------

export type AppointmentType =
  | "checkup"
  | "ultrasound"
  | "lab"
  | "specialist"
  | "delivery_planning"
  | "postpartum_checkup"
  | "baby_checkup"
  | "other";

export type AppointmentStatus = "upcoming" | "done" | "cancelled";

export interface ChecklistTask {
  id: Id;
  title: string;
  done: boolean;
}

export interface Appointment {
  id: Id;
  householdId: Id;
  type: AppointmentType;
  date: IsoDate;
  time?: string;
  doctorId?: Id;
  hospitalId?: Id;
  city?: string;
  notes?: string;
  preparationTasks: ChecklistTask[];
  status: AppointmentStatus;
  reminder: boolean;
}

export interface UltrasoundRecord {
  id: Id;
  householdId: Id;
  appointmentId?: Id;
  date: IsoDate;
  gestationalWeek?: number;
  notes?: string;
  mediaAssetIds: Id[];
}

export type CareProviderKind = "follow_up" | "delivery" | "specialist" | "backup";

export interface CareProvider {
  id: Id;
  householdId: Id;
  kind: CareProviderKind;
  name: string;
  specialty?: string;
  hospitalId?: Id;
  city?: string;
  phone?: string;
  notes?: string;
}

export type HospitalPurpose = "follow_up" | "delivery" | "emergency";

export interface Hospital {
  id: Id;
  householdId: Id;
  name: string;
  city: string;
  purposes: HospitalPurpose[];
  phone?: string;
  locationUrl?: string;
  notes?: string;
  /** A belief, never a guarantee — the UI says «يُعتقد أنه مشمول». */
  insuranceBelievedCovered?: boolean;
  insuranceLastVerifiedAt?: IsoDate;
}

export interface InsuranceRecord {
  id: Id;
  householdId: Id;
  provider: string;
  planName?: string;
  coverageNotes?: string;
  candidateHospitalIds: Id[];
  lastVerifiedAt?: IsoDate;
}

export interface VerificationTask {
  id: Id;
  householdId: Id;
  subject: string;
  relatedHospitalId?: Id;
  relatedInsuranceId?: Id;
  done: boolean;
  createdAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Preparation
// ---------------------------------------------------------------------------

export type PreparationStatus = "owned" | "need_to_buy" | "not_required" | "undecided";

export type PreparationCategoryKey =
  | "sleep"
  | "mobility"
  | "feeding"
  | "clothing"
  | "care"
  | "hospital"
  | "travel"
  | "mother_postpartum"
  | "other";

export interface PreparationItem {
  id: Id;
  householdId: Id;
  category: PreparationCategoryKey;
  title: string;
  status: PreparationStatus;
  /** Major physical objects render image-led cards; small ones render rows. */
  size: "object" | "task";
  mediaAssetId?: Id;
  notes?: string;
  inHospitalBag: boolean;
  updatedAt: IsoDateTime;
  // PRIVACY: no price or money field may ever be added here. Money lives in
  // FundingGoal (linked via preparationItemId) so shared preparation payloads
  // structurally cannot leak finance.
}

// ---------------------------------------------------------------------------
// Finance (permission-protected)
// ---------------------------------------------------------------------------

export type FundingPhase = "before_birth" | "at_birth" | "after_birth";
export type FundingPriority = "essential" | "important" | "optional";

export interface FundingGoal {
  id: Id;
  householdId: Id;
  name: string;
  expectedCost?: number;
  actualCost?: number;
  fundedAmount: number;
  /** Savings calculations use THIS date — never spendingDate. */
  fundingDate: IsoDate;
  /** Descriptive only: when the money is expected to leave. */
  spendingDate?: IsoDate;
  phase: FundingPhase;
  priority: FundingPriority;
  notes?: string;
  preparationItemId?: Id;
  visibility: "private" | "shared";
  ownerUserId: Id;
  createdAt: IsoDateTime;
}

export interface FundingContribution {
  id: Id;
  goalId: Id;
  householdId: Id;
  amount: number;
  date: IsoDate;
  note?: string;
}

/** Every recalculation explains itself. Silent changes are forbidden. */
export interface RecalculationExplanation {
  id: Id;
  goalId: Id;
  householdId: Id;
  at: IsoDateTime;
  whatChanged: string;
  why: string;
  previousMonthly: number;
  newMonthly: number;
  effectiveFundingDate: IsoDate;
}

// ---------------------------------------------------------------------------
// Travel, birth plan, postpartum
// ---------------------------------------------------------------------------

export interface TravelPlan {
  id: Id;
  householdId: Id;
  fromCity: string;
  toCity: string;
  plannedDate?: IsoDate;
  returnDate?: IsoDate;
  notes?: string;
  tasks: ChecklistTask[];
}

export interface BirthPlan {
  id: Id;
  householdId: Id;
  hospitalId?: Id;
  doctorId?: Id;
  insuranceId?: Id;
  supportPerson?: string;
  preferences?: string;
  updatedAt: IsoDateTime;
}

export type FeedingMethod = "breastfeeding" | "pumped" | "formula";

export interface FeedingPreference {
  id: Id;
  householdId: Id;
  /** Chosen by the family; never assumed. Any combination is valid. */
  methods: FeedingMethod[];
  notes?: string;
  updatedAt: IsoDateTime;
}

export type PostpartumTaskKind = "feeding" | "medical" | "mother_care" | "home" | "other";

export interface PostpartumTask {
  id: Id;
  householdId: Id;
  kind: PostpartumTaskKind;
  title: string;
  dueDate?: IsoDate;
  done: boolean;
  createdAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export type MediaFamily =
  | "weekly-baby"
  | "preparation-object"
  | "family-story"
  | "care"
  | "travel"
  | "birth"
  | "postpartum"
  | "user-upload";

export interface MediaAsset {
  id: Id;
  family: MediaFamily;
  src: string;
  posterSrc?: string;
  mimeType: string;
  alt: string;
  focalPoint?: { x: number; y: number };
  crop?: "portrait" | "hero" | "card" | "full-bleed";
  safeArea?: { top?: number; right?: number; bottom?: number; left?: number };
  week?: number;
  medicallyReviewed?: boolean;
  reviewNotes?: string;
  reducedMotionSrc?: string;
  loadingFallback?: string;
  errorFallback?: string;
}

export interface WeeklyBabyMedia {
  week: number;
  videoMp4?: string;
  videoWebm?: string;
  /** Optional until production posters exist; the Hero falls back to a neutral placeholder. */
  posterWebp?: string;
  thumbnailWebp?: string;
  alt: string;
  developmentSummary: string;
  developmentPoints: string[];
  approximateSize?: string;
  approximateSizeComparison?: string;
  approximateWeight?: string;
  focalPoint: { x: number; y: number };
  safeArea: { top: number; right: number; bottom: number; left: number };
  loopDurationSeconds?: number;
  medicallyReviewed: boolean;
  reviewedAt?: string;
  reviewNotes?: string;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface NotificationPreference {
  id: Id;
  householdId: Id;
  memberId: Id;
  appointments: boolean;
  weeklyUpdate: boolean;
  preparation: boolean;
  finance: boolean;
}

// ---------------------------------------------------------------------------
// Root persisted shape for one household
// ---------------------------------------------------------------------------

export interface HouseholdData {
  household: Household;
  users: User[];
  members: HouseholdMember[];
  pregnancy: Pregnancy | null;
  baby: Baby | null;
  milestones: JourneyMilestone[];
  appointments: Appointment[];
  ultrasounds: UltrasoundRecord[];
  careProviders: CareProvider[];
  hospitals: Hospital[];
  insurance: InsuranceRecord[];
  verificationTasks: VerificationTask[];
  preparationItems: PreparationItem[];
  fundingGoals: FundingGoal[];
  fundingContributions: FundingContribution[];
  recalculations: RecalculationExplanation[];
  travelPlans: TravelPlan[];
  birthPlan: BirthPlan | null;
  feedingPreference: FeedingPreference | null;
  postpartumTasks: PostpartumTask[];
  mediaAssets: MediaAsset[];
  notificationPreferences: NotificationPreference[];
}
