import { randomInt } from '../misc/utils.js';
import { Board } from './Board.js';
import { CardType, CardValue, SolvedPuzzle, ALL_TYPES } from './types.js';

function randomType(): CardType {
  return ALL_TYPES[randomInt(6)];
}

export abstract class Rule {
  abstract apply(board: Board): boolean;
  abstract getAsText(): string;
}

/**
 * Rule: two cards are located at neighboring columns.
 */
export class NearRule extends Rule {
  type1: CardType; val1: CardValue;
  type2: CardType; val2: CardValue;

  constructor(puzzle: SolvedPuzzle) {
    super();
    const col1 = randomInt(6);
    this.type1 = randomType();
    this.val1 = puzzle[this.type1][col1];

    let col2: number;
    if (col1 === 0) col2 = 1;
    else if (col1 === 5) col2 = 4;
    else col2 = randomInt(2) ? col1 + 1 : col1 - 1;

    this.type2 = randomType();
    this.val2 = puzzle[this.type2][col2];
  }

  private applyToCol(board: Board, col: number, nearType: CardType, nearVal: CardValue, thisType: CardType, thisVal: CardValue): boolean {
    const hasLeft = col === 0 ? false : board.isPossible(col - 1, nearType, nearVal);
    const hasRight = col === 5 ? false : board.isPossible(col + 1, nearType, nearVal);

    if (!hasRight && !hasLeft && board.isPossible(col, thisType, thisVal)) {
      board.blacklistAt(col, thisType, thisVal);
      return true;
    }
    return false;
  }

  apply(board: Board): boolean {
    let changed = false;
    for (let i = 0; i < 6; i++) {
      if (this.applyToCol(board, i, this.type1, this.val1, this.type2, this.val2)) changed = true;
      if (this.applyToCol(board, i, this.type2, this.val2, this.type1, this.val1)) changed = true;
    }
    if (changed) {
      this.apply(board);
    }
    return changed;
  }

  getAsText(): string {
    return `${this.type1}${this.val1} is near to ${this.type2}${this.val2}`;
  }
}

/**
 * Rule: one card is located to the left of another card.
 */
export class DirectionRule extends Rule {
  row1: CardType; thing1: CardValue;
  row2: CardType; thing2: CardValue;

  constructor(puzzle: SolvedPuzzle) {
    super();
    this.row1 = randomType();
    this.row2 = randomType();
    const col1 = randomInt(5);
    const col2 = randomInt(5 - col1) + col1 + 1;
    this.thing1 = puzzle[this.row1][col1];
    this.thing2 = puzzle[this.row2][col2];
  }

  apply(board: Board): boolean {
    let changed = false;

    // Check col 0 to 5
    for (let i = 0; i < 6; i++) {
      if (board.isPossible(i, this.row2, this.thing2)) {
        board.blacklistAt(i, this.row2, this.thing2);
        changed = true;
      }
      if (board.isPossible(i, this.row1, this.thing1)) {
        break;
      }
    }

    // Check col 5 down to 0
    for (let i = 5; i >= 0; i--) {
      if (board.isPossible(i, this.row1, this.thing1)) {
        board.blacklistAt(i, this.row1, this.thing1);
        changed = true;
      }
      if (board.isPossible(i, this.row2, this.thing2)) {
        break;
      }
    }

    return changed;
  }

  getAsText() {
    return `${this.row1}${this.thing1} is from the left of ${this.row2}${this.thing2}`;
  }
}

/**
 * Rule: one card is located at a specific column.
 */
export class OpenRule extends Rule {
  col: number; row: CardType; thing: CardValue;

  constructor(puzzle: SolvedPuzzle) {
    super();
    this.col = randomInt(6);
    this.row = randomType();
    this.thing = puzzle[this.row][this.col];
  }

  apply(board: Board): boolean {
    if (!board.isDefined(this.col, this.row)) {
      board.validateAt(this.col, this.row, this.thing);
      return true;
    }
    return false;
  }

  getAsText() {
    return `${this.row}${this.thing} is at column ${this.col + 1}`;
  }
}

/**
 * Rule: two cards are located in the same column.
 */
export class UnderRule extends Rule {
  row1: CardType; thing1: CardValue;
  row2: CardType; thing2: CardValue;

  constructor(puzzle: SolvedPuzzle) {
    super();
    const col = randomInt(6);
    this.row1 = randomType();
    this.thing1 = puzzle[this.row1][col];
    do {
      this.row2 = randomType();
    } while (this.row2 === this.row1);
    this.thing2 = puzzle[this.row2][col];
  }

  apply(board: Board): boolean {
    let changed = false;

    for (let i = 0; i < 6; i++) {
      if (!board.isPossible(i, this.row1, this.thing1) && board.isPossible(i, this.row2, this.thing2)) {
        board.blacklistAt(i, this.row2, this.thing2);
        changed = true;
      }
      if (!board.isPossible(i, this.row2, this.thing2) && board.isPossible(i, this.row1, this.thing1)) {
        board.blacklistAt(i, this.row1, this.thing1);
        changed = true;
      }
    }

    return changed;
  }

  getAsText() {
    return `${this.row1}${this.thing1} is the same column as ${this.row2}${this.thing2}`;
  }
}

/**
 * Rule: one card is located between two other cards.
 */
export class BetweenRule extends Rule {
  row1: CardType; thing1: CardValue;
  row2: CardType; thing2: CardValue;
  centerRow: CardType; centerThing: CardValue;

  constructor(puzzle: SolvedPuzzle) {
    super();
    this.centerRow = randomType();
    this.row1 = randomType();
    this.row2 = randomType();

    const centerCol = randomInt(4) + 1; // 1 to 4
    this.centerThing = puzzle[this.centerRow][centerCol];
    if (randomInt(2)) {
      this.thing1 = puzzle[this.row1][centerCol - 1];
      this.thing2 = puzzle[this.row2][centerCol + 1];
    } else {
      this.thing1 = puzzle[this.row1][centerCol + 1];
      this.thing2 = puzzle[this.row2][centerCol - 1];
    }
  }

  apply(board: Board): boolean {
    let changed = false;

    if (board.isPossible(0, this.centerRow, this.centerThing)) {
      changed = true;
      board.blacklistAt(0, this.centerRow, this.centerThing);
    }

    if (board.isPossible(5, this.centerRow, this.centerThing)) {
      changed = true;
      board.blacklistAt(5, this.centerRow, this.centerThing);
    }

    let goodLoop: boolean;
    do {
      goodLoop = false;

      for (let i = 1; i < 5; i++) {
        if (board.isPossible(i, this.centerRow, this.centerThing)) {
          const conditionA = board.isPossible(i - 1, this.row1, this.thing1) && board.isPossible(i + 1, this.row2, this.thing2);
          const conditionB = board.isPossible(i - 1, this.row2, this.thing2) && board.isPossible(i + 1, this.row1, this.thing1);
          if (!(conditionA || conditionB)) {
            board.blacklistAt(i, this.centerRow, this.centerThing);
            goodLoop = true;
          }
        }
      }

      for (let i = 0; i < 6; i++) {
        let leftPossible = false;
        let rightPossible = false;

        if (board.isPossible(i, this.row2, this.thing2)) {
          if (i >= 2) leftPossible = board.isPossible(i - 1, this.centerRow, this.centerThing) && board.isPossible(i - 2, this.row1, this.thing1);
          if (i < 4) rightPossible = board.isPossible(i + 1, this.centerRow, this.centerThing) && board.isPossible(i + 2, this.row1, this.thing1);
          if (!leftPossible && !rightPossible) {
            board.blacklistAt(i, this.row2, this.thing2);
            goodLoop = true;
          }
        }

        if (board.isPossible(i, this.row1, this.thing1)) {
          if (i >= 2) leftPossible = board.isPossible(i - 1, this.centerRow, this.centerThing) && board.isPossible(i - 2, this.row2, this.thing2);
          if (i < 4) rightPossible = board.isPossible(i + 1, this.centerRow, this.centerThing) && board.isPossible(i + 2, this.row2, this.thing2);
          if (!leftPossible && !rightPossible) {
            board.blacklistAt(i, this.row1, this.thing1);
            goodLoop = true;
          }
        }
      }

      if (goodLoop) {
        changed = true;
      }
    } while (goodLoop);

    return changed;
  }

  getAsText() {
    return `${this.centerRow}${this.centerThing} is between ${this.row1}${this.thing1} and ${this.row2}${this.thing2}`;
  }
}
