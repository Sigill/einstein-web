import { expect } from 'chai';
import { generateRandomSolvedPuzzle } from './SolvedPuzzle.js';
import { canSolve } from './PuzzleGenerator.js';
import { OpenRule } from './Rules.js';

describe('PuzzleGenerator helpers', () => {
  it('canSolve returns true for a puzzle with explicit OpenRules for every card', () => {
    const puzzle = generateRandomSolvedPuzzle(2, 3);
    const rules = [];
    for (let t = 0; t < puzzle.numTypes; t++) {
      for (let c = 0; c < puzzle.numValues; c++) {
        rules.push(new OpenRule({ type: t, value: puzzle.grid[t][c] }, c));
      }
    }
    expect(canSolve(puzzle, rules)).to.equal(true);
  });
});
