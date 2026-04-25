import { randomInt } from '../misc/utils.js';
import { Board } from './Board.js';
import { CardType, ALL_TYPES, Card, sameCard } from './Card.js';
import { SolvedPuzzle } from './SolvedPuzzle.js';

function randomType(): CardType {
  return ALL_TYPES[randomInt(6)];
}

export abstract class Rule {
  abstract apply(board: Board): boolean;
  abstract getAsText(): string;
  abstract hasCard(card: Card): boolean;

  abstract toJSON(): NearRuleData | DirectionRuleData | OpenRuleData | UnderRuleData | BetweenRuleData;
}

export interface NearRuleData {
  type: 'near';
  card1: Card;
  card2: Card;
}

/**
 * Rule: two cards are located at neighboring columns.
 */
export class NearRule extends Rule {
  readonly card1: Card;
  readonly card2: Card;

  constructor(card1: Card, card2: Card) {
    super();
    this.card1 = card1;
    this.card2 = card2;
  }

  static FromSolvedPuzzle(puzzle: SolvedPuzzle): NearRule {
    const col1 = randomInt(6);
    const type1 = randomType();
    const val1 = puzzle[type1][col1];

    let col2: number;
    if (col1 === 0) col2 = 1;
    else if (col1 === 5) col2 = 4;
    else col2 = randomInt(2) ? col1 + 1 : col1 - 1;

    const type2 = randomType();
    const val2 = puzzle[type2][col2];

    return new NearRule({ type: type1, value: val1 }, { type: type2, value: val2 });
  }

  private applyToCol(board: Board, col: number, nearCard: Card, thisCard: Card): boolean {
    const hasLeft = col === 0 ? false : board.isPossible(col - 1, nearCard);
    const hasRight = col === 5 ? false : board.isPossible(col + 1, nearCard);

    if (!hasRight && !hasLeft && board.isPossible(col, thisCard)) {
      board.excludeAt(col, thisCard);
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

  hasCard(card: Card): boolean {
    return sameCard(this.card1, card) || sameCard(this.card2, card);
  }

  toJSON(): NearRuleData {
    return {
      type: 'near' as const,
      card1: this.card1,
      card2: this.card2,
    };
  }
}

export interface DirectionRuleData {
  type: 'direction';
  card1: Card;
  card2: Card;
}

/**
 * Rule: one card is located to the left of another card.
 */
export class DirectionRule extends Rule {
  readonly card1: Card;
  readonly card2: Card;

  constructor(card1: Card, card2: Card) {
    super();
    this.card1 = card1;
    this.card2 = card2;
  }

  static FromSolvedPuzzle(puzzle: SolvedPuzzle): DirectionRule {
    const row1 = randomType();
    const row2 = randomType();
    const col1 = randomInt(5);
    const col2 = randomInt(5 - col1) + col1 + 1;
    const val1 = puzzle[row1][col1];
    const val2 = puzzle[row2][col2];
    return new DirectionRule({ type: row1, value: val1 }, { type: row2, value: val2 });
  }

  apply(board: Board): boolean {
    let changed = false;

    // Check col 0 to 5
    for (let i = 0; i < 6; i++) {
      if (board.isPossible(i, this.card2)) {
        board.excludeAt(i, this.card2);
        changed = true;
      }
      if (board.isPossible(i, this.card1)) {
        break;
      }
    }

    // Check col 5 down to 0
    for (let i = 5; i >= 0; i--) {
      if (board.isPossible(i, this.card1)) {
        board.excludeAt(i, this.card1);
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

  hasCard(card: Card): boolean {
    return sameCard(this.card1, card) || sameCard(this.card2, card);
  }

  toJSON(): DirectionRuleData {
    return {
      type: 'direction',
      card1: this.card1,
      card2: this.card2,
    };
  }

  static fromJSON(json: Omit<DirectionRuleData, 'type'>): DirectionRule {
    return new DirectionRule(json.card1, json.card2);
  }
}

export interface OpenRuleData {
  type: 'open';
  card: Card;
  col: number;
}

/**
 * Rule: one card is located at a specific column.
 */
export class OpenRule extends Rule {
  readonly card: Card;
  readonly col: number;

  constructor(card: Card, col: number) {
    super();
    this.card = card;
    this.col = col;
  }

  static FromSolvedPuzzle(puzzle: SolvedPuzzle): OpenRule {
    const col = randomInt(6);
    const row = randomType();
    const val = puzzle[row][col];
    return new OpenRule({ type: row, value: val }, col);
  }

  apply(board: Board): boolean {
    if (!board.isDefined(this.col, this.card.type)) {
      board.setAt(this.col, this.card);
      return true;
    }
    return false;
  }

  getAsText() {
    return `${this.card.type}${this.card.value} is at column ${this.col + 1}`;
  }

  hasCard(card: Card): boolean {
    return sameCard(this.card, card);
  }

  toJSON(): OpenRuleData {
    return {
      type: 'open',
      card: this.card,
      col: this.col,
    };
  }

  static fromJSON(json: Omit<OpenRuleData, 'type'>): OpenRule {
    return new OpenRule(json.card, json.col);
  }
}

export interface UnderRuleData {
  type: 'under';
  card1: Card;
  card2: Card;
}

/**
 * Rule: two cards are located in the same column.
 */
export class UnderRule extends Rule {
  readonly card1: Card;
  readonly card2: Card;

  constructor(card1: Card, card2: Card) {
    super();
    this.card1 = card1;
    this.card2 = card2;
  }

  static FromSolvedPuzzle(puzzle: SolvedPuzzle): UnderRule {
    const col = randomInt(6);
    const row1 = randomType();
    const val1 = puzzle[row1][col];
    let row2: CardType;
    do {
      row2 = randomType();
    } while (row2 === row1);
    const val2 = puzzle[row2][col];
    return new UnderRule({ type: row1, value: val1 }, { type: row2, value: val2 });
  }

  apply(board: Board): boolean {
    let changed = false;

    for (let i = 0; i < 6; i++) {
      if (!board.isPossible(i, this.card1) && board.isPossible(i, this.card2)) {
        board.excludeAt(i, this.card2);
        changed = true;
      }
      if (!board.isPossible(i, this.card2) && board.isPossible(i, this.card1)) {
        board.excludeAt(i, this.card1);
        changed = true;
      }
    }

    return changed;
  }

  getAsText() {
    return `${this.card1.type}${this.card1.value} is the same column as ${this.card2.type}${this.card2.value}`;
  }

  hasCard(card: Card): boolean {
    return sameCard(this.card1, card) || sameCard(this.card2, card);
  }

  toJSON(): UnderRuleData {
    return {
      type: 'under',
      card1: this.card1,
      card2: this.card2,
    };
  }

  static fromJSON(json: Omit<UnderRuleData, 'type'>): UnderRule {
    return new UnderRule(json.card1, json.card2);
  }
}

export interface BetweenRuleData {
  type: 'between';
  card1: Card;
  card2: Card;
  centerCard: Card;
}

/**
 * Rule: one card is located between two other cards.
 */
export class BetweenRule extends Rule {
  readonly card1: Card;
  readonly card2: Card;
  readonly centerCard: Card;

  constructor(card1: Card, card2: Card, centerCard: Card) {
    super();
    this.card1 = card1;
    this.card2 = card2;
    this.centerCard = centerCard;
  }

  static FromSolvedPuzzle(puzzle: SolvedPuzzle): BetweenRule {
    const centerType = randomType();
    const type1 = randomType();
    const type2 = randomType();

    const centerCol = randomInt(4) + 1; // 1 to 4
    const centerCard = { type: centerType, value: puzzle[centerType][centerCol] };

    let card1: Card;
    let card2: Card;
    if (randomInt(2)) {
      card1 = { type: type1, value: puzzle[type1][centerCol - 1] };
      card2 = { type: type2, value: puzzle[type2][centerCol + 1] };
    } else {
      card1 = { type: type1, value: puzzle[type1][centerCol + 1] };
      card2 = { type: type2, value: puzzle[type2][centerCol - 1] };
    }

    return new BetweenRule(card1, card2, centerCard);
  }

  apply(board: Board): boolean {
    let changed = false;

    if (board.isPossible(0, this.centerCard)) {
      changed = true;
      board.excludeAt(0, this.centerCard);
    }

    if (board.isPossible(5, this.centerCard)) {
      changed = true;
      board.excludeAt(5, this.centerCard);
    }

    let goodLoop: boolean;
    do {
      goodLoop = false;

      for (let i = 1; i < 5; i++) {
        if (board.isPossible(i, this.centerCard)) {
          const conditionA = board.isPossible(i - 1, this.card1) && board.isPossible(i + 1, this.card2);
          const conditionB = board.isPossible(i - 1, this.card2) && board.isPossible(i + 1, this.card1);
          if (!(conditionA || conditionB)) {
            board.excludeAt(i, this.centerCard);
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
            board.excludeAt(i, this.card2);
            goodLoop = true;
          }
        }

        if (board.isPossible(i, this.card1)) {
          if (i >= 2) leftPossible = board.isPossible(i - 1, this.centerCard) && board.isPossible(i - 2, this.card2);
          if (i < 4) rightPossible = board.isPossible(i + 1, this.centerCard) && board.isPossible(i + 2, this.card2);
          if (!leftPossible && !rightPossible) {
            board.excludeAt(i, this.card1);
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

  hasCard(card: Card): boolean {
    return sameCard(this.card1, card) || sameCard(this.card2, card) || sameCard(this.centerCard, card);
  }

  toJSON(): BetweenRuleData {
    return {
      type: 'between',
      card1: this.card1,
      card2: this.card2,
      centerCard: this.centerCard,
    };
  }

  static fromJSON(json: Omit<BetweenRuleData, 'type'>): BetweenRule {
    return new BetweenRule(json.card1, json.card2, json.centerCard);
  }
}

export type RulesTypes = OpenRule | NearRule | DirectionRule | UnderRule | BetweenRule;

export function printRules(rules: Rule[]) {
  for (const rule of rules) {
    console.log(rule.getAsText());
  }
}

export function ruleFromJSON(json: any): Rule {
  const data = json as { type: string };
  switch (data.type) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    case 'near': return new NearRule(json.card1, json.card2);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    case 'direction': return new DirectionRule(json.card1, json.card2);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    case 'open': return new OpenRule(json.card, json.col);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    case 'under': return new UnderRule(json.card1, json.card2);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    case 'between': return new BetweenRule(json.card1, json.card2, json.centerCard);
    default: throw new Error(`Unknown rule type ${String(data.type)}`);
  }
}
