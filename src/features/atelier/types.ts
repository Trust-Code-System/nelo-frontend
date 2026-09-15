import type { MeasurementValue } from '@/lib/atelier/measurements';

/**
 * Shapes mirroring contracts/atelier-shop-api.proposal.graphql.
 *
 * Hand-written on purpose: these are NOT generated types, because the contract does not
 * exist yet. When the real resolvers land, codegen replaces this file and the fixtures —
 * the components consuming them should not need to change.
 */

export type CommissionContext = 'readyToWear' | 'bespoke' | 'bridal';

export const PROJECT_STAGE_ORDER = [
  'consultation',
  'proposal',
  'confirmed',
  'active',
  'ready',
  'completed',
] as const;
export type ProjectStage = (typeof PROJECT_STAGE_ORDER)[number];

/** Deliberately more granular than the project stage. */
export const ITEM_STAGE_ORDER = [
  'design',
  'materials',
  'cutting',
  'sewing',
  'fitting',
  'qualityControl',
  'ready',
  'delivered',
] as const;
export type ItemStage = (typeof ITEM_STAGE_ORDER)[number];

export const PROJECT_STAGE_LABELS: Readonly<Record<ProjectStage, string>> = {
  consultation: 'Consultation',
  proposal: 'Proposal',
  confirmed: 'Confirmed',
  active: 'In work',
  ready: 'Ready',
  completed: 'Completed',
};

export const ITEM_STAGE_LABELS: Readonly<Record<ItemStage, string>> = {
  design: 'Design',
  materials: 'Materials',
  cutting: 'Cutting',
  sewing: 'Sewing',
  fitting: 'Fitting',
  qualityControl: 'Quality control',
  ready: 'Ready',
  delivered: 'Delivered',
};

export type AppointmentPurpose = 'consultation' | 'fitting';
export type AppointmentLocationMode = 'inStore' | 'customerLocation' | 'virtual';
export type AppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'rescheduled'
  | 'cancelled'
  | 'completed';

export type AtelierAppointment = {
  id: string;
  purpose: AppointmentPurpose;
  context: CommissionContext;
  locationMode: AppointmentLocationMode;
  location: string | null;
  /** Offset-bearing ISO. Rendered in Africa/Lagos unless the customer is elsewhere. */
  scheduledAt: string | null;
  status: AppointmentStatus;
  /** Server decision — never inferred from the date on the client. */
  isCancellable: boolean;
};

export type BespokeItem = {
  id: string;
  name: string;
  stage: ItemStage;
  /**
   * The snapshot this garment is being cut to. Independently confirmed, and NOT a live
   * view of the customer's profile — editing the profile must not change it.
   */
  confirmedMeasurements: MeasurementValue[];
  confirmedAt: string | null;
  estimatedReadyAt: string | null;
};

export type ChargeScheduleEntry = {
  label: string;
  amountMinorUnits: number;
  currencyCode: string;
  dueAt: string | null;
  isSettled: boolean;
  orderCode: string | null;
};

/** Only what this customer may do right now. Never a list of every possible transition. */
export type ProjectAction =
  | 'acceptProposal'
  | 'declineProposal'
  | 'requestAppointment'
  | 'cancelAppointment'
  | 'messageAtelier';

export type BespokeProject = {
  id: string;
  reference: string;
  context: CommissionContext;
  stage: ProjectStage;
  items: BespokeItem[];
  appointments: AtelierAppointment[];
  /**
   * A list, not a single code. An item can link to several Order Lines and one line can
   * fund several items — the frontend must not assume one project equals one Order.
   */
  relatedOrderCodes: string[];
  /** Published by the backend. Never computed here. Null until a proposal is accepted. */
  chargeSchedule: ChargeScheduleEntry[] | null;
  permittedActions: ProjectAction[];
  createdAt: string;
};
