import { SYMBOL_MAP } from "../misc/symbols";
import { shuffleArray } from "../misc/utils";
import { ALL_TYPES, ALL_VALUES, CardType, CardValue } from "./Card";

export type SolvedPuzzle = Record<CardType, CardValue[]>;

export function printPuzzle(puzzle: SolvedPuzzle) {
  for (const type of ALL_TYPES) {
    console.log(`${type}: ${puzzle[type].join(', ')}`);
  }
}

export function printPuzzleWithSymbols(puzzle: SolvedPuzzle) {
  for (const type of ALL_TYPES) {
    console.log(`${type}: ${puzzle[type].map(v => SYMBOL_MAP[type][v]).join(', ')}`);
  }
}

export function generateRandomSolvedPuzzle() {
  const puzzle: SolvedPuzzle = {} as SolvedPuzzle;

  for (const type of ALL_TYPES) {
    const row = [...ALL_VALUES];
    shuffleArray(row);
    puzzle[type] = row;
  }

  return puzzle;
}

export function toJSON(puzzle: SolvedPuzzle): CardValue[][] {
  return ALL_TYPES.map(type => puzzle[type]);
}

export function fromJSON(json: CardValue[][]): SolvedPuzzle {
  const puzzle: SolvedPuzzle = {} as SolvedPuzzle;
  for (let i = 0; i < ALL_TYPES.length; i++) {
    puzzle[ALL_TYPES[i]] = json[i];
  }
  return puzzle;
}
