import { expect } from 'chai';
import { generateRandomSolvedPuzzle, toJSON, fromJSON, getPuzzleValue } from './SolvedPuzzle.js';

describe('SolvedPuzzle', () => {
  it('generateRandomSolvedPuzzle produces correct dimensions and values in range', () => {
    const puzzle = generateRandomSolvedPuzzle(3, 3);
    expect(puzzle.numTypes).to.equal(3);
    expect(puzzle.numValues).to.equal(3);
    for (let t = 0; t < 3; t++) {
      expect(puzzle.grid[t].length).to.equal(3);
      for (let c = 0; c < 3; c++) {
        const v = getPuzzleValue(puzzle, t, c);
        expect(v).to.be.at.least(0);
        expect(v).to.be.below(3);
      }
    }
  });

  it('toJSON/fromJSON roundtrip preserves structure', () => {
    const puzzle = generateRandomSolvedPuzzle(2, 4);
    const json = toJSON(puzzle);
    const parsed = fromJSON(json);
    expect(parsed).to.deep.equal(puzzle);
  });
});
