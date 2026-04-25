import { Board } from './engine/Board.js';
import { Hint, makeHint } from './engine/Hint.js';
import { BoardView } from './ui/BoardView.js';
import { createVerticalHintElement, createHorizontalHintElement } from './ui/HintsView.js';
import { generatePuzzleWithAcceptableAmountOfHints } from './engine/PuzzleGenerator.js';
import { OpenRule, NearRule, DirectionRule, UnderRule, BetweenRule, ruleFromJSON, RulesTypes } from './engine/Rules.js';
import { VisibilityObservable } from './ui/VisibilityObservable.js';
import { toJSON as serializePuzzle, fromJSON as puzzleFromJSON, SolvedPuzzle } from './engine/SolvedPuzzle.js';
import { CardValue } from './engine/Card.js';
import { findFirstApplicableHint, findFirstDiff, blinkHint, blinkSquareCandidate } from './ui/HintUtils.js';
import { ScreenManager } from './ui/screens/ScreenManager.js';
import { createPauseScreen } from './ui/screens/PauseScreen.js';
import { createWinScreen } from './ui/screens/WinScreen.js';
import { createLoseScreen } from './ui/screens/LoseScreen.js';
import { Timer } from './ui/Timer.js';

document.addEventListener('DOMContentLoaded', () => {
  const { board, puzzle, hints } = generate();

  const screenManager = new ScreenManager(document.getElementById('screen-overlay')!);

  const timer = new Timer(document.getElementById('timer-container')!);

  screenManager.onToggle((active) => {
    if (active) {
      timer.pause();
    } else {
      timer.start();
    }
  });

  timer.start();

  document.getElementById('btn-new-game')!.addEventListener('click', () => {
    window.location.reload();
  });

  const pauseGame = () => {
    screenManager.push(createPauseScreen());
  };

  document.getElementById('btn-pause')!.addEventListener('click', pauseGame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseGame();
    }
  });

  const boardView = new BoardView(board);
  document.getElementById('board-container')!.appendChild(boardView.element);

  const hintsVContainer = document.getElementById('hints-v-container')!;
  const hintsHContainer = document.getElementById('hints-h-container')!;

  // Global observable to control if the hint view should be displayed
  const hintViewVisibility = new VisibilityObservable();

  const hintToElement = makeHintViews(hints, hintViewVisibility, hintsVContainer, hintsHContainer);

  // Toggle hints button toggles the visibility state of the entire hint view
  document.getElementById('btn-toggle-hints')!.addEventListener('click', () => {
    hintViewVisibility.toggle();
  });

  document.getElementById('btn-reveal-hint')!.addEventListener('click', () => {
    const hint = findFirstApplicableHint(board.toJSON(), hints);
    if (hint) {
      blinkHint(hint, hintToElement);
    } else {
      alert('No direct deductions found from any hint. You might need to combine information or you have made a mistake.');
    }
  });

  document.getElementById('btn-reveal-card')!.addEventListener('click', () => {
    const oldState = board.toJSON();
    const hint = findFirstApplicableHint(oldState, hints);
    if (hint) {
      blinkHint(hint, hintToElement);

      const tempBoard = Board.fromJSON(oldState);
      hint.rule.apply(tempBoard);
      const newState = tempBoard.toJSON();

      const diff = findFirstDiff(oldState, newState, hint.rule);
      if (diff) {
        blinkSquareCandidate(boardView, diff);
      }
    } else {
      alert('No direct deductions found from any hint.');
    }
  });

  let finished = false;

  let logTimeout: number | undefined;
  const logGameState = () => {
    if (finished) return;
    if (logTimeout !== undefined) return;
    logTimeout = window.setTimeout(() => {
      logTimeout = undefined;
      if (finished) return;
      const data = {
        puzzle: serializePuzzle(puzzle),
        hints: hints.map(({ rule, visibility }) => {
          return {
            rule: rule.toJSON(),
            visible: visibility.isVisible,
          };
        }),
        board: board.toJSON(),
      };
      console.log(data);
    }, 0);
  };

  board.addEventListener('change', () => {
    if (finished) return;

    if (!board.isValid(puzzle)) {
      finished = true;
      timer.stop();
      screenManager.push(createLoseScreen({
        onRestart: () => window.location.reload(),
      }));
    } else if (board.isSolved()) {
      finished = true;
      timer.stop();
      const timeMs = timer.getElapsedTime();
      const bestTimeMs = timer.getBestTime();
      const isBest = timer.saveBestTime();
      screenManager.push(createWinScreen({
        timeMs,
        isBest,
        bestTimeMs,
        onRestart: () => window.location.reload(),
      }));
    }

    logGameState();
  });

  for (const hint of hints) {
    hint.visibility.addEventListener('visibilityChanged', () => {
      logGameState();
    });
  }
});

function generate(debugData?: {
  board: CardValue[][][];
  puzzle: CardValue[][];
  hints: { rule: RulesTypes, visible: boolean }[]
}): {
  board: Board;
  puzzle: SolvedPuzzle;
  hints: Hint[]
} {
  if (debugData !== undefined) {
    const board = Board.fromJSON(debugData.board);
    const puzzle = puzzleFromJSON(debugData.puzzle);
    const hints = debugData.hints.map((h) => {
      const rule = ruleFromJSON(h.rule);
      return makeHint(rule, h.visible);
    });

    return { board, puzzle, hints };
  } else {
    const board = Board.create();
    const generated = generatePuzzleWithAcceptableAmountOfHints();
    const puzzle = generated.puzzle;
    const hints = generated.rules.map(rule => makeHint(rule));

    board.applyRules(generated.rules.filter(r => r instanceof OpenRule));

    return { board, puzzle, hints };
  }
}

function makeHintViews(
  hints: Hint[],
  hintViewVisibility: VisibilityObservable,
  hintsVContainer: HTMLElement,
  hintsHContainer: HTMLElement,
): Map<Hint, HTMLElement> {
  const hintToElement = new Map<Hint, HTMLElement>();
  for (const hint of hints) {
    if (hint.rule instanceof OpenRule) continue;

    if (hint.rule instanceof UnderRule) {
      const el = createVerticalHintElement(hint, hintViewVisibility);
      hintsVContainer.appendChild(el);
      hintToElement.set(hint, el);
    } else if (hint.rule instanceof NearRule || hint.rule instanceof DirectionRule || hint.rule instanceof BetweenRule) {
      const el = createHorizontalHintElement(hint, hintViewVisibility);
      hintsHContainer.appendChild(el);
      hintToElement.set(hint, el);
    }
  }
  return hintToElement;
}
