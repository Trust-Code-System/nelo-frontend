/**
 * The house size chart.
 *
 * BODY measurements, not garment measurements — the number you get off a tape measure, not
 * the width of the finished dress. That distinction is the single most common reason a size
 * guide gets misread.
 *
 * ASSUMPTION TO CONFIRM: this is a conventional UK grading, evenly stepped, covering the
 * full 6–30 range the brand promises. It is the right *shape* for the guide and the right
 * range, but it is not yet Nelo's own block — the atelier has to confirm the actual bust,
 * waist and hip at each size before this page is treated as authoritative. It is kept as
 * data in one place so that correction is a single edit.
 *
 * Centimetres are the source; inches are derived rather than typed, so the two columns can
 * never disagree with each other.
 */

export type SizeRow = {
  uk: number;
  bustCm: number;
  waistCm: number;
  hipCm: number;
};

export const SIZE_CHART: readonly SizeRow[] = [
  { uk: 6, bustCm: 78, waistCm: 60, hipCm: 86 },
  { uk: 8, bustCm: 83, waistCm: 65, hipCm: 91 },
  { uk: 10, bustCm: 88, waistCm: 70, hipCm: 96 },
  { uk: 12, bustCm: 93, waistCm: 75, hipCm: 101 },
  { uk: 14, bustCm: 98, waistCm: 80, hipCm: 106 },
  { uk: 16, bustCm: 103, waistCm: 85, hipCm: 111 },
  { uk: 18, bustCm: 109, waistCm: 91, hipCm: 117 },
  { uk: 20, bustCm: 115, waistCm: 97, hipCm: 123 },
  { uk: 22, bustCm: 121, waistCm: 103, hipCm: 129 },
  { uk: 24, bustCm: 127, waistCm: 109, hipCm: 135 },
  { uk: 26, bustCm: 133, waistCm: 115, hipCm: 141 },
  { uk: 28, bustCm: 139, waistCm: 121, hipCm: 147 },
  { uk: 30, bustCm: 145, waistCm: 127, hipCm: 153 },
];

/** One decimal place is the honest precision for a converted body measurement on a page. */
export function cmToInches(cm: number): string {
  return (cm / 2.54).toFixed(1);
}
