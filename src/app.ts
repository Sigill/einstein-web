import { Board } from './engine/Board.js';
import { Hint } from './engine/Hint.js';
import { BoardView } from './ui/BoardView.js';
import { createVerticalHintElement, createHorizontalHintElement } from './ui/HintsView.js';
import { generatePuzzleWithAcceptableAmountOfHints } from './engine/PuzzleGenerator.js';
import { OpenRule, NearRule, DirectionRule, UnderRule, BetweenRule, ruleFromJSON } from './engine/Rules.js';
import { VisibilityObservable } from './ui/VisibilityObservable.js';
import { toJSON as serializePuzzle, fromJSON as puzzleFromJSON, SolvedPuzzle } from './engine/SolvedPuzzle.js';
import { CardValue } from './engine/Card.js';
import { findFirstApplicableHint, findFirstDiff, blinkHint, blinkSquareCandidate } from './ui/HintUtils.js';
import { ScreenManager } from './ui/screens/ScreenManager.js';
import { createPauseScreen } from './ui/screens/PauseScreen.js';
import { createWinScreen } from './ui/screens/WinScreen.js';
import { createLoseScreen } from './ui/screens/LoseScreen.js';
import { Timer } from './ui/Timer.js';

// (window as any).debugGameState = ;

document.addEventListener('DOMContentLoaded', () => {
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

    allHints.push(...generated.rules.map(rule => ({
      visibility: new VisibilityObservable(),
      rule,
    })));

    board.applyRules(generated.rules.filter(r => r instanceof OpenRule));
  }

  const boardView = new BoardView(board);
  document.getElementById('board-container')!.appendChild(boardView.element);

  const hintsVContainer = document.getElementById('hints-v-container')!;
  const hintsHContainer = document.getElementById('hints-h-container')!;

  // Global observable to control if the hint view should be displayed
  const hintViewVisibility = new VisibilityObservable();

  const hintToElement = new Map<Hint, HTMLElement>();
  for (const hint of allHints) {
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

  // Toggle hints button toggles the visibility state of the entire hint view
  const btnToggleHints = document.getElementById('btn-toggle-hints')!;
  btnToggleHints.addEventListener('click', () => {
    hintViewVisibility.toggle();
  });

  const btnRevealHint = document.getElementById('btn-reveal-hint')!;
  btnRevealHint.addEventListener('click', () => {
    const hint = findFirstApplicableHint(board.toJSON(), allHints);
    if (hint) {
      blinkHint(hint, hintToElement);
    } else {
      alert('No direct deductions found from any hint. You might need to combine information or you have made a mistake.');
    }
  });

  const btnRevealCard = document.getElementById('btn-reveal-card')!;
  btnRevealCard.addEventListener('click', () => {
    const oldState = board.toJSON();
    const hint = findFirstApplicableHint(oldState, allHints);
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
        hints: allHints.map(({ rule, visibility }) => {
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

  for (const hint of allHints) {
    hint.visibility.addEventListener('visibilityChanged', () => {
      logGameState();
    });
  }
});
