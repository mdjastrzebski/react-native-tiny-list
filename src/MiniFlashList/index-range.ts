/** A range of item indices; `endIndex` is exclusive. */
export interface IndexRange {
  startIndex: number;
  endIndex: number;
}

export const EMPTY_RANGE: IndexRange = { startIndex: 0, endIndex: 0 };

export function areRangesEqual(a: IndexRange, b: IndexRange): boolean {
  return a.startIndex === b.startIndex && a.endIndex === b.endIndex;
}

export function isInRange(index: number, range: IndexRange): boolean {
  return index >= range.startIndex && index < range.endIndex;
}
