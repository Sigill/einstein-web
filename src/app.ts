import { Board } from './engine/Board.js';
import { Hint } from './engine/Hint.js';
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

  const allHints: Hint[] = [];

  const { puzzle, rules } = generatePuzzleWithAcceptableAmountOfHints();

  for (const rule of rules) {
    if (rule instanceof OpenRule) {
      board.validateAt(rule.col, rule.card);
    } else {
      const hint = new Hint(rule);
      allHints.push(hint);
      if (rule instanceof UnderRule) {
        hintsVContainer.appendChild(createVerticalHintElement(hint));
      } else if (rule instanceof NearRule || rule instanceof DirectionRule || rule instanceof BetweenRule) {
        hintsHContainer.appendChild(createHorizontalHintElement(hint));
      }
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
