import type { BespokeProject, MeasurementProfile } from './types';

/**
 * FIXTURES. Not production data, and not a guess at production field names.
 *
 * These exist so the Atelier UI can be built and reviewed before the customer-facing
 * resolvers are written. Every screen consuming them must show the fixture banner. When the
 * real contract lands (see contracts/atelier-shop-api.proposal.graphql), this file is
 * deleted - not adapted.
 */

/** Steps shown on the public intake page. */
export const PROJECT_STAGES = [
  { key: 'consultation', index: '01', label: 'Consultation', current: true },
  { key: 'proposal', index: '02', label: 'Proposal', current: false },
  { key: 'confirmed', index: '03', label: 'Confirmed', current: false },
  { key: 'active', index: '04', label: 'In work', current: false },
  { key: 'ready', index: '05', label: 'Ready', current: false },
  { key: 'completed', index: '06', label: 'Completed', current: false },
] as const;

/**
 * A bridal commission mid-production: two garments at different stages, which is the whole
 * reason the tracker needs two levels rather than one progress bar.
 *
 * Measurements are real conversions - 34.00 in is 863.60 mm.
 */
const BRIDAL: BespokeProject = {
  id: 'proj_8fa21c',
  reference: 'NW-BR-0416',
  context: 'bridal',
  stage: 'active',
  createdAt: '2026-03-02T10:15:00+01:00',
  relatedOrderCodes: ['NW-10422', 'NW-10731'],
  permittedActions: ['requestAppointment', 'messageAtelier'],
  items: [
    {
      id: 'item_a1',
      name: 'Ceremony gown',
      stage: 'fitting',
      confirmedAt: '2026-05-14T11:00:00+01:00',
      estimatedReadyAt: '2026-10-09T00:00:00+01:00',
      confirmedMeasurements: [
        { code: 'bust', millimetres: '863.60' },
        { code: 'waist', millimetres: '711.20' },
        { code: 'hip', millimetres: '965.20' },
        { code: 'height', millimetres: '1676.40' },
        { code: 'shoulderWidth', millimetres: '393.70' },
        { code: 'sleeveLength', millimetres: '590.55' },
        { code: 'inseam', millimetres: null },
      ],
    },
    {
      id: 'item_a2',
      name: 'Reception dress',
      stage: 'cutting',
      confirmedAt: '2026-05-14T11:00:00+01:00',
      estimatedReadyAt: '2026-10-23T00:00:00+01:00',
      confirmedMeasurements: [
        { code: 'bust', millimetres: '863.60' },
        { code: 'waist', millimetres: '711.20' },
        { code: 'hip', millimetres: '965.20' },
        { code: 'height', millimetres: '1676.40' },
        { code: 'shoulderWidth', millimetres: '393.70' },
        { code: 'sleeveLength', millimetres: null },
        { code: 'inseam', millimetres: null },
      ],
    },
  ],
  appointments: [
    {
      id: 'apt_1',
      purpose: 'consultation',
      context: 'bridal',
      locationMode: 'inStore',
      location: 'Lagos atelier - Victoria Island',
      scheduledAt: '2026-03-11T10:00:00+01:00',
      status: 'completed',
      isCancellable: false,
    },
    {
      id: 'apt_2',
      purpose: 'fitting',
      context: 'bridal',
      locationMode: 'inStore',
      location: 'Lagos atelier - Victoria Island',
      scheduledAt: '2026-05-14T11:00:00+01:00',
      status: 'completed',
      isCancellable: false,
    },
    {
      id: 'apt_3',
      purpose: 'fitting',
      context: 'bridal',
      locationMode: 'inStore',
      location: 'Lagos atelier - Victoria Island',
      scheduledAt: '2026-09-29T14:30:00+01:00',
      status: 'confirmed',
      isCancellable: true,
    },
  ],
  chargeSchedule: [
    {
      label: 'Commission deposit',
      amountMinorUnits: 45000000,
      currencyCode: 'NGN',
      dueAt: '2026-03-18T00:00:00+01:00',
      isSettled: true,
      orderCode: 'NW-10422',
    },
    {
      label: 'Second instalment',
      amountMinorUnits: 45000000,
      currencyCode: 'NGN',
      dueAt: '2026-07-01T00:00:00+01:00',
      isSettled: true,
      orderCode: 'NW-10731',
    },
    {
      label: 'Balance on completion',
      amountMinorUnits: 40000000,
      currencyCode: 'NGN',
      dueAt: '2026-10-09T00:00:00+01:00',
      isSettled: false,
      orderCode: null,
    },
  ],
};

const PROJECTS: Record<string, BespokeProject> = { [BRIDAL.reference]: BRIDAL };

/** Returns null for an unknown reference, so the route can 404 exactly as the real one will. */
export function fixtureProject(reference: string): BespokeProject | null {
  return PROJECTS[reference] ?? null;
}

export function fixtureProjectReferences(): string[] {
  return Object.keys(PROJECTS);
}

/** Reusable measurement profiles. Exactly one is the active default. */
export const PROFILES: MeasurementProfile[] = [
  {
    id: 'prof_default',
    name: 'My measurements',
    isDefault: true,
    confirmedAt: '2026-05-14T11:00:00+01:00',
    confirmedLocation: 'Lagos atelier',
    updatedAt: '2026-05-14T11:00:00+01:00',
    measurements: [
      { code: 'bust', millimetres: '863.60' },
      { code: 'waist', millimetres: '711.20' },
      { code: 'hip', millimetres: '965.20' },
      { code: 'height', millimetres: '1676.40' },
      { code: 'shoulderWidth', millimetres: '393.70' },
      { code: 'sleeveLength', millimetres: '590.55' },
      { code: 'inseam', millimetres: null },
    ],
  },
  {
    id: 'prof_self',
    name: 'Self-measured, Aug 2026',
    isDefault: false,
    confirmedAt: null,
    confirmedLocation: null,
    updatedAt: '2026-08-02T18:40:00+01:00',
    measurements: [
      { code: 'bust', millimetres: '869.95' },
      { code: 'waist', millimetres: '717.55' },
      { code: 'hip', millimetres: '971.55' },
      { code: 'height', millimetres: '1676.40' },
      { code: 'shoulderWidth', millimetres: null },
      { code: 'sleeveLength', millimetres: null },
      { code: 'inseam', millimetres: null },
    ],
  },
];
