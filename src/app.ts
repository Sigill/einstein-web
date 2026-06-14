import { Board } from './engine/Board.js';
import { Hint, makeHint } from './engine/Hint.js';
import { BoardView } from './ui/BoardView.js';
import { createVerticalHintElement, createHorizontalHintElement } from './ui/HintsView.js';
import { generatePuzzleWithAcceptableAmountOfHints } from './engine/PuzzleGenerator.js';
import { OpenRule, NearRule, DirectionRule, UnderRule, BetweenRule, ruleFromJSON, RulesTypes } from './engine/Rules.js';
import { VisibilityObservable } from './misc/VisibilityObservable.js';
import { toJSON as serializePuzzle, fromJSON as puzzleFromJSON, SolvedPuzzle, SolvedPuzzleJSON } from './engine/SolvedPuzzle.js';
import { CardValue } from './engine/Card.js';
import { findFirstApplicableHint, findFirstDiff, blinkHint, blinkSquareCandidate } from './ui/HintUtils.js';
import { ScreenManager } from './ui/screens/ScreenManager.js';
import { createPauseScreen } from './ui/screens/PauseScreen.js';
import { createWinScreen } from './ui/screens/WinScreen.js';
import { createLoseScreen } from './ui/screens/LoseScreen.js';
import { createHelpScreen } from './ui/screens/HelpScreen.js';
import { Timer } from './ui/Timer.js';
import { ActionMenu } from './ui/ActionMenu.js';

interface Config {
  numTypes: number; numValues: number;
  limits: { horizontal: number; vertical: number; };
  layout: {
    horizontalHints: { columns: number; rows: number; };
    verticalHints: { columns: number; };
  };
}

const configurations = {
  '4x4': {
    numTypes: 4, numValues: 4,
    limits: { horizontal: 12, vertical: 8 },
    layout: {
      horizontalHints: { columns: 2, rows: 6 },
      verticalHints: { columns: 12 }
    }
  },
  '5x5': {
    numTypes: 5, numValues: 5,
    limits: { horizontal: 20, vertical: 10 },
    layout: {
      horizontalHints: { columns: 3, rows: 8 },
      verticalHints: { columns: 15 }
    }
  },
  '6x6': {
    numTypes: 6, numValues: 6,
    limits: { horizontal: 24, vertical: 15 },
    layout: {
      horizontalHints: { columns: 3, rows: 8 },
      verticalHints: { columns: 15 }
    }
  },
} satisfies Record<string, Config>;

let board: Board;
let puzzle: SolvedPuzzle;
let hints: Hint[];
let boardView: BoardView;
let hintToElement: Map<Hint, HTMLElement>;
let finished = false;
let hasUsedAssistance = false;

const fullscreenContainer = document.querySelector('.fullscreen-container')!;
const timerElement = document.getElementById('timer-container')!;
const boardContainer = document.getElementById('board-container')!;
const hintsVContainer = document.getElementById('hints-v-container')!;
const hintsHContainer = document.getElementById('hints-h-container')!;

const screenManager = new ScreenManager(document.getElementById('screen-overlay')!);
const timer = new Timer(timerElement);
const hintViewVisibility = new VisibilityObservable();

screenManager.onToggle((active) => {
  if (active) {
    ActionMenu.closeActive();
    timer.pause();
  } else {
    timer.start();
  }
});

document.getElementById('btn-new-game')!.addEventListener('click', () => {
  startGame();
});

const pauseGame = () => {
  screenManager.push(createPauseScreen());
};

document.getElementById('btn-pause')!.addEventListener('click', pauseGame);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && !finished) {
    pauseGame();
  }
});

// Toggle hints button toggles the visibility state of the entire hint view
document.getElementById('btn-toggle-hints')!.addEventListener('click', () => {
  hintViewVisibility.toggle();
});

document.getElementById('btn-help')!.addEventListener('click', () => {
  screenManager.push(createHelpScreen(() => screenManager.pop()));
});

function startGame(debugData?: Parameters<typeof generate>[1]) {
  finished = false;
  hasUsedAssistance = false;
  timer.reset();
  timerElement.classList.remove('assisted');

  const config: Config = configurations['4x4'];

  // Clear existing views
  boardContainer.replaceChildren();
  hintsVContainer.replaceChildren();
  hintsHContainer.replaceChildren();

  const generated = generate(config, debugData);
  board = generated.board;
  puzzle = generated.puzzle;
  hints = generated.hints;

  boardView = new BoardView(board);
  // Set the fullscreen container attribute so CSS can adapt to the puzzle size
  fullscreenContainer.setAttribute('data-puzzle-config', `${board.numTypes}x${board.numValues}`);
  boardContainer.appendChild(boardView.element);

  hintToElement = makeHintViews(hints, hintViewVisibility, hintsVContainer, hintsHContainer, config);

  board.addEventListener('change', () => {
    if (finished) return;

    if (!board.isValid(puzzle)) {
      finished = true;
      timer.stop();
      screenManager.push(createLoseScreen({
        onRestart: () => startGame(),
      }));
    } else if (board.isSolved()) {
      finished = true;
      timer.stop();
      const timeMs = timer.getElapsedTime();
      const bestTimeMs = timer.getBestTime(hasUsedAssistance);
      const isBest = timer.saveBestTime(hasUsedAssistance);
      screenManager.push(createWinScreen({
        timeMs,
        isBest,
        bestTimeMs,
        hasUsedAssistance,
        onRestart: () => startGame(),
      }));
    }

    logGameState();
  });

  for (const hint of hints) {
    hint.visibility.addEventListener('visibilityChanged', () => {
      logGameState();
    });
  }

  timer.start();
  logGameState();
}

startGame();

document.getElementById('btn-reveal-hint')!.addEventListener('click', () => {
  hasUsedAssistance = true;
  timerElement.classList.add('assisted');
  const hint = findFirstApplicableHint(board.toJSON(), hints);
  if (hint) {
    blinkHint(hint, hintToElement);
  } else {
    alert('No direct deductions found from any hint. You might need to combine information or you have made a mistake.');
  }
});

document.getElementById('btn-reveal-card')!.addEventListener('click', () => {
  hasUsedAssistance = true;
  timerElement.classList.add('assisted');
  const oldState = board.toJSON();
  const hint = findFirstApplicableHint(oldState, hints);
  if (hint) {
    blinkHint(hint, hintToElement);

    const tempBoard = Board.fromJSON(oldState, board.numTypes, board.numValues);
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

let logTimeout: number | undefined;
function logGameState() {
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
}

function generate(config: Config, debugData?: {
  board: CardValue[][][];
  puzzle: SolvedPuzzleJSON;
  hints: { rule: RulesTypes, visible: boolean }[]
}): {
  board: Board;
  puzzle: SolvedPuzzle;
  hints: Hint[]
} {
  if (debugData !== undefined) {
    const puzzle = puzzleFromJSON(debugData.puzzle);
    const board = Board.fromJSON(debugData.board, puzzle.numTypes, puzzle.numValues);
    const hints = debugData.hints.map((h) => {
      const rule = ruleFromJSON(h.rule);
      return makeHint(rule, h.visible);
    });

    return { board, puzzle, hints };
  } else {
    const board = Board.create(config.numTypes, config.numValues);
    const generated = generatePuzzleWithAcceptableAmountOfHints(config);
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
  config: Config,
): Map<Hint, HTMLElement> {
  const hintToElement = new Map<Hint, HTMLElement>();
  let hCount = 0;
  let vCount = 0;
  for (const hint of hints) {
    if (hint.rule instanceof OpenRule) continue;

    if (hint.rule instanceof UnderRule) {
      const el = createVerticalHintElement(hint, hintViewVisibility);
      hintsVContainer.appendChild(el);
      hintToElement.set(hint, el);
      vCount++;
    } else if (hint.rule instanceof NearRule || hint.rule instanceof DirectionRule || hint.rule instanceof BetweenRule) {
      const el = createHorizontalHintElement(hint, hintViewVisibility);
      hintsHContainer.appendChild(el);
      hintToElement.set(hint, el);
      hCount++;
    }
  }

  // Create dummy hints to fill the grid.
  for (let i = hCount; i < config.layout.horizontalHints.rows * config.layout.horizontalHints.columns; i++) {
    const el = document.createElement('div');
    el.classList.add('hint', 'horizontal-hint');
    hintsHContainer.appendChild(el);
  }

  for (let i = vCount; i < config.layout.verticalHints.columns; i++) {
    const el = document.createElement('div');
    el.classList.add('hint', 'vertical-hint');
    hintsVContainer.appendChild(el);
  }

  return hintToElement;
}
