import { getSymbol } from "../misc/symbols";
import { iota, shuffleArray } from "../misc/utils";
import { CardValue, getTypeLabel, getValueLabel } from "./Card";

/**
 * A fully solved puzzle of arbitrary size.
 *
 * - `numTypes`  – number of types (rows) in the puzzle.
 * - `numValues` – number of values (columns) in the puzzle.
 * - `grid`      – grid[typeIndex][colIndex] = the card value index placed there (0-based).
 *
 * This replaces the old `Record<CardType, CardValue[]>` shape and is the
 * single source of truth for which types and values a puzzle uses.
 */
export interface SolvedPuzzle {
  numTypes: number;
  numValues: number;
  grid: CardValue[][];
}

/** Returns the value in the solved puzzle at position (type, col). */
export function getPuzzleValue(puzzle: SolvedPuzzle, type: number, col: number): CardValue {
  if (type < 0 || type >= puzzle.numTypes) throw new Error(`Type '${type}' is not part of this puzzle`);
  return puzzle.grid[type][col];
}

export function printPuzzle(puzzle: SolvedPuzzle) {
  for (let i = 0; i < puzzle.numTypes; i++) {
    const labels = puzzle.grid[i].map(v => getValueLabel(v));
    const typeLabel = getTypeLabel(i);
    console.log(`${typeLabel}: ${labels.join(', ')}`);
  }
}

export function printPuzzleWithSymbols(puzzle: SolvedPuzzle) {
  for (let i = 0; i < puzzle.numTypes; i++) {
    const typeLabel = getTypeLabel(i);
    console.log(`${typeLabel}: ${puzzle.grid[i].map(v => getSymbol(i, v)).join(', ')}`);
  }
}

/**
 * Generates a random fully-solved puzzle of the given size.
 * Defaults to the classic 6×6 configuration.
 */
export function generateRandomSolvedPuzzle(numTypes = 6, numValues = 6): SolvedPuzzle {
  const values = iota(numValues);
  const grid = Array.from({ length: numTypes }, () => {
    const row = [...values];
    shuffleArray(row);
    return row;
  });
  return { numTypes, numValues, grid };
}

export interface SolvedPuzzleJSON {
  numTypes: number;
  numValues: number;
  grid: CardValue[][];
}

export function toJSON(puzzle: SolvedPuzzle): SolvedPuzzleJSON {
  return { numTypes: puzzle.numTypes, numValues: puzzle.numValues, grid: puzzle.grid };
}

export function fromJSON(json: SolvedPuzzleJSON): SolvedPuzzle {
  return { numTypes: json.numTypes, numValues: json.numValues, grid: json.grid };
}
