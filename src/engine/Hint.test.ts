import { expect } from 'chai';
import { makeHint } from './Hint.js';
import { OpenRule } from './Rules.js';

describe('Hint', () => {
  it('makeHint creates a hint with visibility observable', () => {
    const rule = new OpenRule({ type: 0, value: 0 }, 0);
    const hint = makeHint(rule, false);
    expect(hint.rule).to.equal(rule);
    expect(hint.visibility.isVisible).to.equal(false);
    hint.visibility.toggle();
    expect(hint.visibility.isVisible).to.equal(true);
  });
});
