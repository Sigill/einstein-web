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
  card1: Card;
  card2: Card;

  constructor(puzzle: SolvedPuzzle) {
    super();
    const col1 = randomInt(6);
    const type1 = randomType();
    const val1 = puzzle[type1][col1];
    this.card1 = { type: type1, value: val1 };

    let col2: number;
    if (col1 === 0) col2 = 1;
    else if (col1 === 5) col2 = 4;
    else col2 = randomInt(2) ? col1 + 1 : col1 - 1;

    const type2 = randomType();
    const val2 = puzzle[type2][col2];
    this.card2 = { type: type2, value: val2 };
  }

  private applyToCol(board: Board, col: number, nearCard: Card, thisCard: Card): boolean {
    const hasLeft = col === 0 ? false : board.isPossible(col - 1, nearCard);
    const hasRight = col === 5 ? false : board.isPossible(col + 1, nearCard);

    if (!hasRight && !hasLeft && board.isPossible(col, thisCard)) {
      board.blacklistAt(col, thisCard);
      return true;
    }
    return false;
  }

  apply(board: Board): boolean {
    let changed = false;
    for (let i = 0; i < 6; i++) {
      if (this.applyToCol(board, i, this.card1, this.card2)) changed = true;
      if (this.applyToCol(board, i, this.card2, this.card1)) changed = true;
    }
    if (changed) {
      this.apply(board);
    }
    return changed;
  }

  getAsText(): string {
    return `${this.card1.type}${this.card1.value} is near to ${this.card2.type}${this.card2.value}`;
  }
}

/**
 * Rule: one card is located to the left of another card.
 */
export class DirectionRule extends Rule {
  card1: Card;
  card2: Card;

  constructor(puzzle: SolvedPuzzle) {
    super();
    const row1 = randomType();
    const row2 = randomType();
    const col1 = randomInt(5);
    const col2 = randomInt(5 - col1) + col1 + 1;
    const val1 = puzzle[row1][col1];
    const val2 = puzzle[row2][col2];
    this.card1 = { type: row1, value: val1 };
    this.card2 = { type: row2, value: val2 };
  }

  apply(board: Board): boolean {
    let changed = false;

    // Check col 0 to 5
    for (let i = 0; i < 6; i++) {
      if (board.isPossible(i, this.card2)) {
        board.blacklistAt(i, this.card2);
        changed = true;
      }
      if (board.isPossible(i, this.card1)) {
        break;
      }
    }

    // Check col 5 down to 0
    for (let i = 5; i >= 0; i--) {
      if (board.isPossible(i, this.card1)) {
        board.blacklistAt(i, this.card1);
        changed = true;
      }
      if (board.isPossible(i, this.card2)) {
        break;
      }
    }

    return changed;
  }

  getAsText() {
    return `${this.card1.type}${this.card1.value} is from the left of ${this.card2.type}${this.card2.value}`;
  }
}

/**
 * Rule: one card is located at a specific column.
 */
export class OpenRule extends Rule {
  card: Card;
  col: number;

  constructor(puzzle: SolvedPuzzle) {
    super();
    this.col = randomInt(6);
    const row = randomType();
    const val = puzzle[row][this.col];
    this.card = { type: row, value: val };
  }

  apply(board: Board): boolean {
    if (!board.isDefined(this.col, this.card.type)) {
      board.validateAt(this.col, this.card);
      return true;
    }
    return false;
  }

  getAsText() {
    return `${this.card.type}${this.card.value} is at column ${this.col + 1}`;
  }
}

/**
 * Rule: two cards are located in the same column.
 */
export class UnderRule extends Rule {
  card1: Card;
  card2: Card;

  constructor(puzzle: SolvedPuzzle) {
    super();
    const col = randomInt(6);
    const row1 = randomType();
    const val1 = puzzle[row1][col];
    this.card1 = { type: row1, value: val1 };
    let row2: CardType;
    do {
      row2 = randomType();
    } while (row2 === row1);
    const val2 = puzzle[row2][col];
    this.card2 = { type: row2, value: val2 };
  }

  apply(board: Board): boolean {
    let changed = false;

    for (let i = 0; i < 6; i++) {
      if (!board.isPossible(i, this.card1) && board.isPossible(i, this.card2)) {
        board.blacklistAt(i, this.card2);
        changed = true;
      }
      if (!board.isPossible(i, this.card2) && board.isPossible(i, this.card1)) {
        board.blacklistAt(i, this.card1);
        changed = true;
      }
    }

    return changed;
  }

  getAsText() {
    return `${this.card1.type}${this.card1.value} is the same column as ${this.card2.type}${this.card2.value}`;
  }
}

/**
 * Rule: one card is located between two other cards.
 */
export class BetweenRule extends Rule {
  card1: Card;
  card2: Card;
  centerCard: Card;

  constructor(puzzle: SolvedPuzzle) {
    super();
    const centerType = randomType();
    const type1 = randomType();
    const type2 = randomType();

    const centerCol = randomInt(4) + 1; // 1 to 4
    this.centerCard = { type: centerType, value: puzzle[centerType][centerCol] };

    if (randomInt(2)) {
      this.card1 = { type: type1, value: puzzle[type1][centerCol - 1] };
      this.card2 = { type: type2, value: puzzle[type2][centerCol + 1] };
    } else {
      this.card1 = { type: type1, value: puzzle[type1][centerCol + 1] };
      this.card2 = { type: type2, value: puzzle[type2][centerCol - 1] };
    }
  }

  apply(board: Board): boolean {
    let changed = false;

    if (board.isPossible(0, this.centerCard)) {
      changed = true;
      board.blacklistAt(0, this.centerCard);
    }

    if (board.isPossible(5, this.centerCard)) {
      changed = true;
      board.blacklistAt(5, this.centerCard);
    }

    let goodLoop: boolean;
    do {
      goodLoop = false;

      for (let i = 1; i < 5; i++) {
        if (board.isPossible(i, this.centerCard)) {
          const conditionA = board.isPossible(i - 1, this.card1) && board.isPossible(i + 1, this.card2);
          const conditionB = board.isPossible(i - 1, this.card2) && board.isPossible(i + 1, this.card1);
          if (!(conditionA || conditionB)) {
            board.blacklistAt(i, this.centerCard);
            goodLoop = true;
          }
        }
      }

      for (let i = 0; i < 6; i++) {
        let leftPossible = false;
        let rightPossible = false;

        if (board.isPossible(i, this.card2)) {
          if (i >= 2) leftPossible = board.isPossible(i - 1, this.centerCard) && board.isPossible(i - 2, this.card1);
          if (i < 4) rightPossible = board.isPossible(i + 1, this.centerCard) && board.isPossible(i + 2, this.card1);
          if (!leftPossible && !rightPossible) {
            board.blacklistAt(i, this.card2);
            goodLoop = true;
          }
        }

        if (board.isPossible(i, this.card1)) {
          if (i >= 2) leftPossible = board.isPossible(i - 1, this.centerCard) && board.isPossible(i - 2, this.card2);
          if (i < 4) rightPossible = board.isPossible(i + 1, this.centerCard) && board.isPossible(i + 2, this.card2);
          if (!leftPossible && !rightPossible) {
            board.blacklistAt(i, this.card1);
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
    return `${this.centerCard.type}${this.centerCard.value} is between ${this.card1.type}${this.card1.value} and ${this.card2.type}${this.card2.value}`;
  }
}
