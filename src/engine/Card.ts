export type CardType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type CardValue = 1 | 2 | 3 | 4 | 5 | 6;

export const ALL_TYPES: CardType[] = ['A', 'B', 'C', 'D', 'E', 'F'];
export const ALL_VALUES: CardValue[] = [1, 2, 3, 4, 5, 6];

export interface Card {
  type: CardType;
  value: CardValue;
}
