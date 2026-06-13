import { Board } from './Board.js';
import { Rule, NearRule, OpenRule, UnderRule, DirectionRule, BetweenRule, printRules } from './Rules.js';
import { generateRandomSolvedPuzzle, printPuzzle, SolvedPuzzle } from './SolvedPuzzle.js';

/**
 * Generates a random rule appropriate for the given puzzle's dimensions.
 */
function genRule(puzzle: SolvedPuzzle): Rule {
  const a = Math.floor(Math.random() * 14);
  switch (a) {
    case 0:
    case 1:
    case 2:
    case 3: return NearRule.FromSolvedPuzzle(puzzle);
    case 4: return OpenRule.FromSolvedPuzzle(puzzle);
    case 5:
    case 6: return UnderRule.FromSolvedPuzzle(puzzle);
    case 7:
    case 8:
    case 9:
    case 10: return DirectionRule.FromSolvedPuzzle(puzzle);
    case 11:
    case 12:
    case 13: return BetweenRule.FromSolvedPuzzle(puzzle);
    default: return genRule(puzzle); // Shouldn't happen given the boundary, but kept for symmetry
  }
}

/**
 * Checks if the puzzle can be solved with the given rules.
 */
export function canSolve(puzzle: SolvedPuzzle, rules: Rule[]): boolean {
  const numTypes = puzzle.numTypes;
  const numValues = puzzle.numValues;
  const board = Board.create(numTypes, numValues);
  let changed;

  do {
    changed = false;
    for (const rule of rules) {
      if (rule.apply(board)) {
        changed = true;
        if (!board.isValid(puzzle)) {
          throw new Error('Invalid possibilities after applying rule: ' + rule.getAsText());
        }
      }
    }
  } while (changed);

  return board.isSolved();
}

/**
 * Removes rules from the puzzle while maintaining solvability.
 */
function removeRules(puzzle: SolvedPuzzle, rules: Rule[]) {
  console.groupCollapsed('Removing rules');
  let possible;

  do {
    possible = false;
    for (let i = 0; i < rules.length; i++) {
      if (canSolve(puzzle, rules.toSpliced(i, 1))) {
        possible = true;
        console.log(`Removing rule: ${rules[i].getAsText()}`);
        rules.splice(i, 1);
        break;
      }
    }
  } while (possible);
  console.groupEnd();
}

/**
 * Generates random rules for the puzzle until it is solvable.
 */
function generateRules(puzzle: SolvedPuzzle, rules: Rule[]) {
  let rulesDone = false;

  do {
    const rule = genRule(puzzle);
    const ruleText = rule.getAsText();

    // De-duplicate rules
    if (rules.some(r => r.getAsText() === ruleText)) {
      continue;
    }

    rules.push(rule);
    rulesDone = canSolve(puzzle, rules);
  } while (!rulesDone);
}

export function generatePuzzle(numTypes = 6, numValues = 6): { puzzle: SolvedPuzzle; rules: Rule[] } {
  const puzzle: SolvedPuzzle = generateRandomSolvedPuzzle(numTypes, numValues);

  printPuzzle(puzzle);

  const rules: Rule[] = [];
  generateRules(puzzle, rules);

  console.groupCollapsed(`${rules.length} rules generated`);
  printRules(rules);
  console.groupEnd();

  removeRules(puzzle, rules);

  console.group('Final rules');
  printRules(rules);
  console.groupEnd();

  return { puzzle, rules };
}

function countHints(rules: Rule[]): { horizontal: number, vertical: number } {
  let horizontal = 0;
  let vertical = 0;
  for (const rule of rules) {
    if (rule instanceof UnderRule) {
      vertical++;
    } else if (rule instanceof NearRule || rule instanceof DirectionRule || rule instanceof BetweenRule) {
      horizontal++;
    }
  }
  return { horizontal, vertical };
}

/**
 * Hint display capacity constants for a standard 6×6 game.
 * These may need adjusting for other board sizes.
 */
const MAX_HORIZONTAL_HINTS = 24;
const MAX_VERTICAL_HINTS = 15;

export function generatePuzzleWithAcceptableAmountOfHints(numTypes = 6, numValues = 6) {
  console.group('Generating solvable puzzle');
  do {
    const { puzzle, rules } = generatePuzzle(numTypes, numValues);

    const hints = countHints(rules);
    console.log(`Puzzle has ${hints.horizontal} horizontal and ${hints.vertical} vertical hints`);

    if (hints.horizontal <= MAX_HORIZONTAL_HINTS && hints.vertical <= MAX_VERTICAL_HINTS) {
      console.groupEnd();
      return { puzzle, rules };
    }
    console.groupEnd();
    // eslint-disable-next-line no-constant-condition
  } while (true);
}
