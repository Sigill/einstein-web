import { Board } from './engine/Board.js';
import { Hint } from './engine/Hint.js';
import { BoardView } from './ui/BoardView.js';
import { createVerticalHintElement, createHorizontalHintElement } from './ui/HintsView.js';
import { generatePuzzleWithAcceptableAmountOfHints } from './engine/PuzzleGenerator.js';
import { OpenRule, NearRule, DirectionRule, UnderRule, BetweenRule, ruleFromJSON } from './engine/Rules.js';
import { VisibilityObservable } from './ui/VisibilityObservable.js';
import { toJSON as serializePuzzle, fromJSON as puzzleFromJSON, SolvedPuzzle } from './engine/SolvedPuzzle.js';
import { CardValue } from './engine/types.js';

// (window as any).debugGameState = ;

document.addEventListener('DOMContentLoaded', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const debugData = (window as any).debugGameState as {
    board: CardValue[][][],
    puzzle: CardValue[][],
    hints: { rule: any, visible: boolean }[]
  } | undefined;

  let board: Board;
  let puzzle: SolvedPuzzle;
  const allHints: Hint[] = [];

  if (debugData) {
    board = Board.fromJSON(debugData.board);
    puzzle = puzzleFromJSON(debugData.puzzle);
    debugData.hints.forEach((h) => {
      const rule = ruleFromJSON(h.rule);
      allHints.push({
        rule,
        visibility: new VisibilityObservable(h.visible),
      });
    });
  } else {
    board = Board.create();
    const generated = generatePuzzleWithAcceptableAmountOfHints();
    puzzle = generated.puzzle;

    for (const rule of generated.rules) {
      const hint: Hint = {
        visibility: new VisibilityObservable(),
        rule,
      };
      allHints.push(hint);

      if (rule instanceof OpenRule) {
        board.setAt(rule.col, rule.card);
      }
    }
  }

  const boardView = new BoardView(board);
  document.getElementById('board-container')!.appendChild(boardView.element);

  const hintsVContainer = document.getElementById('hints-v-container')!;
  const hintsHContainer = document.getElementById('hints-h-container')!;

  const hintToElement = new Map<Hint, HTMLElement>();
  for (const hint of allHints) {
    if (hint.rule instanceof OpenRule) continue;

    if (hint.rule instanceof UnderRule) {
      const el = createVerticalHintElement(hint);
      hintsVContainer.appendChild(el);
      hintToElement.set(hint, el);
    } else if (hint.rule instanceof NearRule || hint.rule instanceof DirectionRule || hint.rule instanceof BetweenRule) {
      const el = createHorizontalHintElement(hint);
      hintsHContainer.appendChild(el);
      hintToElement.set(hint, el);
    }
  }

  // Switch button toggles the visibility state of all hints by inverting them
  const btnSwitch = document.getElementById('btn-switch')!;
  btnSwitch.addEventListener('click', () => {
    for (const hint of allHints) {
      hint.visibility.toggle();
    }
  });

  const btnHint = document.getElementById('btn-hint')!;
  btnHint.addEventListener('click', () => {
    // Identify the first hint that applies to the board
    // We prioritize visible hints first for better UX
    const candidates = [
      ...allHints.filter(h => h.visibility.isVisible),
      ...allHints.filter(h => !h.visibility.isVisible)
    ];

    for (const hint of candidates) {
      if (hint.rule instanceof OpenRule) continue;

      // We clone the board to test if the rule can make any deductions
      const tempBoard = Board.fromJSON(board.toJSON());
      if (hint.rule.apply(tempBoard)) {
        const el = hintToElement.get(hint);
        if (el) {
          // Found it! Make it blink.
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.remove('blink');
          // Trigger reflow to restart animation if it was already blinking
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          el.offsetWidth;
          el.classList.add('blink');

          // Remove the class after the animation finishes (3 iterations * 0.6s = 1.8s)
          setTimeout(() => el.classList.remove('blink'), 2000);
          return;
        }
      }
    }

    // fallback
    alert('No direct deductions found from any hint. You might need to combine information or you have made a mistake.');
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

    if (!finished) {
      // This doesn't trigger after hiding a hint.
      const data = {
        puzzle: serializePuzzle(puzzle),
        hints: allHints.map(({ rule, visibility }) => {
          return {
            rule: rule.toJSON(),
            visible: visibility.isVisible,
          };
        }),
        board: board.toJSON(),
      };
      console.log(data);
    }
  });
});
