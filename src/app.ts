import { Board } from './engine/Board.js';
import { VerticalHint, HorizontalHint } from './engine/Hint.js';
import { BoardView } from './ui/BoardView.js';
import { createVerticalHintElement, createHorizontalHintElement } from './ui/HintsView.js';
import { generatePuzzleWithAcceptableAmountOfHints } from './engine/PuzzleGenerator.js';
import { OpenRule, NearRule, DirectionRule, UnderRule, BetweenRule } from './engine/Rules.js';

document.addEventListener('DOMContentLoaded', () => {
  const board = new Board();
  const boardView = new BoardView(board);

  document.getElementById('board-container')!.appendChild(boardView.element);

  const hintsVContainer = document.getElementById('hints-v-container')!;
  const hintsHContainer = document.getElementById('hints-h-container')!;

  const allHints: (VerticalHint | HorizontalHint)[] = [];

  const { puzzle, rules } = generatePuzzleWithAcceptableAmountOfHints();

  for (const rule of rules) {
    if (rule instanceof OpenRule) {
      board.validateAt(rule.col, rule.row, rule.thing);
    } else if (rule instanceof UnderRule) {
      const hint = new VerticalHint({ type: rule.row1, value: rule.thing1 }, { type: rule.row2, value: rule.thing2 });
      allHints.push(hint);
      hintsVContainer.appendChild(createVerticalHintElement(hint));
    } else if (rule instanceof NearRule) {
      const hint = new HorizontalHint([{ type: rule.type1, value: rule.val1 }, { type: rule.type2, value: rule.val2 }], 'near');
      allHints.push(hint);
      hintsHContainer.appendChild(createHorizontalHintElement(hint));
    } else if (rule instanceof DirectionRule) {
      const hint = new HorizontalHint([{ type: rule.row1, value: rule.thing1 }, { type: rule.row2, value: rule.thing2 }], 'direction');
      allHints.push(hint);
      hintsHContainer.appendChild(createHorizontalHintElement(hint));
    } else if (rule instanceof BetweenRule) {
      const hint = new HorizontalHint([{ type: rule.row1, value: rule.thing1 }, { type: rule.centerRow, value: rule.centerThing }, { type: rule.row2, value: rule.thing2 }]);
      allHints.push(hint);
      hintsHContainer.appendChild(createHorizontalHintElement(hint));
    }
  }

  // Switch button toggles the visibility state of all hints by inverting them
  const btnSwitch = document.getElementById('btn-switch')!;
  btnSwitch.addEventListener('click', () => {
    for (const hint of allHints) {
      hint.setHidden(!hint.isHidden);
    }
  });

  let finished = false;
  board.addEventListener('change', () => {
    if (finished) return;

    if (!board.isValid(puzzle)) {
      finished = true;
      setTimeout(() => alert('You Lose!'), 50);
    } else if (board.isSolved()) {
      finished = true;
      setTimeout(() => alert('You Win!'), 50);
    }
  });
});
