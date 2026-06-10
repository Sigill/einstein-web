/**
 * `CardType` identifies a row (category) in the puzzle grid.
 * The pool of available types is `ALL_TYPES`; a board uses a prefix slice of it.
 */
export type CardType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/** Numeric card value. Always a positive integer in the range 1..numValues for a given board. */
export type CardValue = number;

/** Full pool of available card types (up to 6 rows). Boards slice a prefix of this array. */
export const ALL_TYPES: CardType[] = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Full pool of available card values (up to 6 columns). Boards slice a prefix of this array. */
export const ALL_VALUES: CardValue[] = [1, 2, 3, 4, 5, 6];

export interface Card {
  type: CardType;
  value: CardValue;
}

export function sameCard(card1: Card, card2: Card): boolean {
  return card1.type === card2.type && card1.value === card2.value;
}
