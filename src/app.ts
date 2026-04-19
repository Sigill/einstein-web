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

  for (const hint of allHints) {
    if (hint.rule instanceof OpenRule) continue;

    if (hint.rule instanceof UnderRule) {
      hintsVContainer.appendChild(createVerticalHintElement(hint));
    } else if (hint.rule instanceof NearRule || hint.rule instanceof DirectionRule || hint.rule instanceof BetweenRule) {
      hintsHContainer.appendChild(createHorizontalHintElement(hint));
    }
  }

  // Switch button toggles the visibility state of all hints by inverting them
  const btnSwitch = document.getElementById('btn-switch')!;
  btnSwitch.addEventListener('click', () => {
    for (const hint of allHints) {
      hint.visibility.toggle();
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
