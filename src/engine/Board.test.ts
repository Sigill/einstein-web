import { expect } from 'chai';
import { Board } from './Board.js';
import { generateRandomSolvedPuzzle } from './SolvedPuzzle.js';

describe('Board', () => {
  it('create, toJSON and fromJSON roundtrip', () => {
    const board = Board.create(2, 3);
    expect(board.isSolved()).to.equal(false);

    const json = board.toJSON();
    const copy = Board.fromJSON(json, 2, 3);
    expect(copy.toJSON()).to.deep.equal(json);
  });

  it('setAt excludes same value in row and defines square', () => {
    const board = Board.create(2, 3);
    // set type 0, column 0 to value 1
    board.setAt(0, { type: 0, value: 1 });
    expect(board.getDefined(0, 0)).to.equal(1);
    // same value should be excluded from other columns in the same row
    expect(board.isPossible(1, { type: 0, value: 1 })).to.equal(false);
  });

  it('excludeAt removes possibility', () => {
    const board = Board.create(2, 3);
    expect(board.isPossible(2, { type: 1, value: 2 })).to.equal(true);
    board.excludeAt(2, { type: 1, value: 2 });
    expect(board.isPossible(2, { type: 1, value: 2 })).to.equal(false);
  });

  it('isValid accepts a solved puzzle when possibilities match', () => {
    const puzzle = generateRandomSolvedPuzzle(2, 3);
    const board = Board.create(2, 3);
    expect(board.isValid(puzzle)).to.equal(true);
  });
});
