/**
 * `CardType` identifies a row (category) in the puzzle grid.
 * The pool of available types is `ALL_TYPES`; a board uses a prefix slice of it.
 */
/** Card type index (0-based). Internally rows are represented by numeric indices. */
export type CardType = number;

/** Card value index (0-based). Internally columns/values are represented by numeric indices. */
export type CardValue = number;

export function getTypeLabel(idx: number): string {
  return String.fromCharCode(65 + idx);
}

export function getValueLabel(idx: number): string {
  return `${idx + 1}`;
}

export interface Card {
  type: CardType;
  value: CardValue;
}

export function sameCard(card1: Card, card2: Card): boolean {
  return card1.type === card2.type && card1.value === card2.value;
}
