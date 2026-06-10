import { SYMBOL_MAP } from "../misc/symbols";
import { shuffleArray } from "../misc/utils";
import { ALL_TYPES, ALL_VALUES, CardType, CardValue } from "./Card";

/**
 * A fully solved puzzle of arbitrary size.
 *
 * - `types`  – ordered slice of ALL_TYPES in use (length = numTypes).
 * - `values` – ordered slice of ALL_VALUES in use (length = numValues).
 * - `grid`   – grid[typeIndex][colIndex] = the card value placed there.
 *
 * This replaces the old `Record<CardType, CardValue[]>` shape and is the
 * single source of truth for which types and values a puzzle uses.
 */
export interface SolvedPuzzle {
  types: CardType[];
  values: CardValue[];
  grid: CardValue[][];
}

/** Returns the value in the solved puzzle at position (type, col). */
export function getPuzzleValue(puzzle: SolvedPuzzle, type: CardType, col: number): CardValue {
  const idx = puzzle.types.indexOf(type);
  if (idx === -1) throw new Error(`Type '${type}' is not part of this puzzle`);
  return puzzle.grid[idx][col];
}

export function printPuzzle(puzzle: SolvedPuzzle) {
  for (let i = 0; i < puzzle.types.length; i++) {
    console.log(`${puzzle.types[i]}: ${puzzle.grid[i].join(', ')}`);
  }
}

export function printPuzzleWithSymbols(puzzle: SolvedPuzzle) {
  for (let i = 0; i < puzzle.types.length; i++) {
    const type = puzzle.types[i];
    console.log(`${type}: ${puzzle.grid[i].map(v => SYMBOL_MAP[type][v]).join(', ')}`);
  }
}

/**
 * Generates a random fully-solved puzzle of the given size.
 * Defaults to the classic 6×6 configuration.
 */
export function generateRandomSolvedPuzzle(numTypes = 6, numValues = 6): SolvedPuzzle {
  const types = ALL_TYPES.slice(0, numTypes);
  const values = ALL_VALUES.slice(0, numValues);
  const grid = types.map(() => {
    const row = [...values];
    shuffleArray(row);
    return row;
  });
  return { types, values, grid };
}

export interface SolvedPuzzleJSON {
  types: CardType[];
  values: CardValue[];
  grid: CardValue[][];
}

export function toJSON(puzzle: SolvedPuzzle): SolvedPuzzleJSON {
  return { types: puzzle.types, values: puzzle.values, grid: puzzle.grid };
}

export function fromJSON(json: SolvedPuzzleJSON): SolvedPuzzle {
  return { types: json.types, values: json.values, grid: json.grid };
}
