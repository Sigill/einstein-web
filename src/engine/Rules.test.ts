import { expect } from 'chai';
import { OpenRule, DirectionRule, UnderRule, NearRule, BetweenRule, ruleFromJSON } from './Rules.js';
import { Board } from './Board.js';

describe('Rules basic behavior and serialization', () => {
  it('OpenRule.apply sets the card at the requested column', () => {
    const board = Board.create(2, 3);
    const r = new OpenRule({ type: 0, value: 1 }, 1);
    const changed = r.apply(board);
    expect(changed).to.equal(true);
    expect(board.getDefined(1, 0)).to.equal(1);
  });

  it('rules serialize to JSON and can be reconstructed with ruleFromJSON', () => {
    const rules = [
      new OpenRule({ type: 0, value: 0 }, 0),
      new DirectionRule({ type: 0, value: 1 }, { type: 1, value: 2 }),
      new UnderRule({ type: 0, value: 1 }, { type: 1, value: 0 }),
      new NearRule({ type: 0, value: 0 }, { type: 1, value: 1 }),
      new BetweenRule({ type: 0, value: 0 }, { type: 1, value: 1 }, { type: 0, value: 2 }),
    ];

    for (const r of rules) {
      const json = r.toJSON();
      const reconstructed = ruleFromJSON(json);
      expect(reconstructed.getAsText()).to.equal(r.getAsText());
    }
  });
});
