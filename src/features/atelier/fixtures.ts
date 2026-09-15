/**
 * FIXTURES. Not production data, and not a guess at production field names.
 *
 * These exist so the Atelier UI can be built and reviewed before the customer-facing
 * resolvers are written. Every screen consuming them must show the fixture banner. When the
 * real contract lands (see contracts/atelier-shop-api.proposal.graphql), this file is
 * deleted — not adapted.
 */

/** Mirrors BespokeProjectStage in the proposed contract. */
export const PROJECT_STAGES = [
  { key: 'consultation', index: '01', label: 'Consultation', current: true },
  { key: 'proposal', index: '02', label: 'Proposal', current: false },
  { key: 'confirmed', index: '03', label: 'Confirmed', current: false },
  { key: 'active', index: '04', label: 'In work', current: false },
  { key: 'ready', index: '05', label: 'Ready', current: false },
  { key: 'completed', index: '06', label: 'Completed', current: false },
] as const;

/** Mirrors BespokeItemStage — deliberately more granular than the project stage. */
export const ITEM_STAGES = [
  'design',
  'materials',
  'cutting',
  'sewing',
  'fitting',
  'qualityControl',
  'ready',
  'delivered',
] as const;
