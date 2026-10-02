export const PROJECT_STAGE_ORDER = ['consultation', 'proposal', 'confirmed', 'active', 'ready', 'completed'] as const;
export const PROJECT_STAGE_LABELS = { consultation: 'Consultation', proposal: 'Proposal', confirmed: 'Confirmed', active: 'In work', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' };
export const ITEM_STAGE_ORDER = ['design', 'awaitingMaterials', 'cutting', 'sewing', 'fitting', 'qualityControl', 'ready', 'delivered'] as const;
export const ITEM_STAGE_LABELS = { design: 'Design', awaitingMaterials: 'Awaiting materials', cutting: 'Cutting', sewing: 'Sewing', fitting: 'Fitting', qualityControl: 'Quality control', ready: 'Ready', delivered: 'Delivered', cancelled: 'Cancelled' };
export const PURPOSE_LABELS = { consultation: 'Consultation', fitting: 'Fitting' };
export const LOCATION_LABELS = { inStore: 'At the Lagos atelier', customerLocation: 'At your address', virtual: 'Video call' };
export const APPOINTMENT_STATUS_LABELS = { requested: 'Awaiting confirmation', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', noShow: 'Missed appointment' };
export function atelierDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return 'To be confirmed';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' as const } : {}), timeZone: 'Africa/Lagos' }).format(new Date(iso));
}
