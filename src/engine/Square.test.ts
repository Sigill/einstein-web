import { expect } from 'chai';
import { Square } from './Square.js';

describe('Square', () => {
  it('initial candidates honor provided values and exclusion works', () => {
    const sq = new Square(0, 0, 3);
    expect(sq.candidates.size).to.equal(3);
    expect(sq._exclude(1)).to.equal(true);
    expect(sq.candidates.has(1)).to.equal(false);
    // excluding a value not present returns false
    expect(sq._exclude(5)).to.equal(false);
  });

  it('setting a value resolves the square and clears other candidates', () => {
    const sq = new Square(0, 1, 3);
    expect(sq.isResolved()).to.equal(false);
    expect(sq._set(2)).to.equal(true);
    expect(sq.isResolved()).to.equal(true);
    expect(sq.candidates.size).to.equal(1);
    expect(Array.from(sq.candidates)[0]).to.equal(2);
  });
});
