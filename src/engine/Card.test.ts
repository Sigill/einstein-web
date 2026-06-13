import { expect } from 'chai';
import { sameCard, getTypeLabel, getValueLabel } from './Card.js';

describe('Card utilities', () => {
  it('getTypeLabel and getValueLabel produce expected labels', () => {
    expect(getTypeLabel(0)).to.equal('A');
    expect(getValueLabel(0)).to.equal('1');
  });

  it('sameCard identifies identical cards', () => {
    const a = { type: 1, value: 2 };
    const b = { type: 1, value: 2 };
    const c = { type: 0, value: 2 };
    expect(sameCard(a, b)).to.equal(true);
    expect(sameCard(a, c)).to.equal(false);
  });
});
