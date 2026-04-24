import { Board } from '../engine/Board.js';
import { Hint } from '../engine/Hint.js';
import { Rule, OpenRule } from '../engine/Rules.js';
import { BoardView } from './BoardView.js';
import { CardType, CardValue, ALL_TYPES } from '../engine/Card.js';

export interface Diff {
  type: CardType;
  col: number;
  value: CardValue;
}

/**
 * Identify the first hint that applies to the board.
 * visible hints are prioritized for better UX.
 */
export function findFirstApplicableHint(board: CardValue[][][], hints: Hint[]): Hint | null {
  const candidates = [
    ...hints.filter(h => h.visibility.isVisible),
    ...hints.filter(h => !h.visibility.isVisible)
  ];

  for (const hint of candidates) {
    if (hint.rule instanceof OpenRule) continue;

    // Use toJSON to clone board state efficiently for testing
    const tempBoard = Board.fromJSON(board);
    if (hint.rule.apply(tempBoard)) {
      return hint;
    }
  }
  return null;
}

/**
 * Identify the first notable difference between two board states.
 * 
 * Logic:
 * 1. Identify all diffs in a row (all candidates removed).
 * 2. If a diff leads to a square being resolved, return the resolved card.
 * 3. Otherwise, if a diff corresponds to a card mentioned in the rule, return that.
 * 4. Otherwise, return the first diff found.
 */
export function findFirstDiff(oldState: CardValue[][][], newState: CardValue[][][], rule: Rule): Diff | null {
  const allDiffs: Diff[] = [];
  const resolvedDiffs: Diff[] = [];

  for (let t = 0; t < ALL_TYPES.length; t++) {
    const type = ALL_TYPES[t];
    for (let c = 0; c < 6; c++) {
      const oldCands = oldState[t][c];
      const newCands = newState[t][c];

      if (oldCands.length !== newCands.length) {
        // Something changed in this square

        // Square was resolved.
        if (newCands.length === 1 && oldCands.length > 1) {
          resolvedDiffs.push({ type, col: c, value: newCands[0] });
        }

        // Candidates were removed
        for (const v of oldCands) {
          if (!newCands.includes(v)) {
            allDiffs.push({ type, col: c, value: v });
          }
        }
      }
    }
  }

  if (allDiffs.length === 0 && resolvedDiffs.length === 0) return null;

  // Priority 1: Resolved card matches a rule card
  for (const rd of resolvedDiffs) {
    if (rule.hasCard(rd)) {
      return rd;
    }
  }

  // Priority 2: Removed candidate matches a rule card
  for (const diff of allDiffs) {
    if (rule.hasCard(diff)) {
      return diff;
    }
  }

  // Priority 3: Any resolved square
  if (resolvedDiffs.length > 0) return resolvedDiffs[0];

  // Fallback: First candidate removal
  return allDiffs[0];
}

/**
 * Make the hint element blink and scroll into view.
 */
export function blinkHint(hint: Hint, hintToElement: Map<Hint, HTMLElement>): void {
  const el = hintToElement.get(hint);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('blink');
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.offsetWidth; // Trigger reflow to restart animation
    el.classList.add('blink');
    setTimeout(() => el.classList.remove('blink'), 2000);
  }
}

/**
 * Make the candidate (or resolved card) in a SquareView blink.
 */
export function blinkSquareCandidate(boardView: BoardView, { type, value, col }: Diff): void {
  const sv = boardView.getSquareView(type, col);
  const cardEl = sv?.getCandidateElement(value);
  if (cardEl) {
    cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    cardEl.classList.remove('blink');
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    cardEl.offsetWidth; // Trigger reflow
    cardEl.classList.add('blink');
    setTimeout(() => cardEl.classList.remove('blink'), 2000);
  }
}
