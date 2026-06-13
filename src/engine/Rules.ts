import { randomInt } from '../misc/utils.js';
import { Board } from './Board.js';
import { Card, sameCard } from './Card.js';
import { SolvedPuzzle } from './SolvedPuzzle.js';
import { getTypeLabel, getValueLabel } from './Card.js';

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
 * Rule: two cards are located at neighbouring columns.
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
    const { grid, numTypes, numValues } = puzzle;
    const col1 = randomInt(numValues);
    const type1 = randomInt(numTypes);
    const val1 = grid[type1][col1];

    const maxCol = numValues - 1;
    let col2: number;
    if (col1 === 0) col2 = 1;
    else if (col1 === maxCol) col2 = maxCol - 1;
    else col2 = randomInt(2) ? col1 + 1 : col1 - 1;
    const type2 = randomInt(numTypes);
    const val2 = grid[type2][col2];

    return new NearRule({ type: type1, value: val1 }, { type: type2, value: val2 });
  }

  private applyToCol(board: Board, col: number, nearCard: Card, thisCard: Card): boolean {
    const hasLeft = col === 0 ? false : board.isPossible(col - 1, nearCard);
    const hasRight = col === board.numValues - 1 ? false : board.isPossible(col + 1, nearCard);

    if (!hasRight && !hasLeft && board.isPossible(col, thisCard)) {
      board.excludeAt(col, thisCard);
      return true;
    }
    return false;
  }

  apply(board: Board): boolean {
    let changed = false;
    for (let i = 0; i < board.numValues; i++) {
      if (this.applyToCol(board, i, this.card1, this.card2)) changed = true;
      if (this.applyToCol(board, i, this.card2, this.card1)) changed = true;
    }
    if (changed) {
      this.apply(board);
    }
    return changed;
  }

  getAsText(): string {
    return `${getTypeLabel(this.card1.type)}${getValueLabel(this.card1.value)} is near to ${getTypeLabel(this.card2.type)}${getValueLabel(this.card2.value)}`;
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
 * Rule: one card is located to the left of another card (at any distance).
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
    const { grid, numTypes, numValues } = puzzle;
    const type1 = randomInt(numTypes);
    const type2 = randomInt(numTypes);
    const col1 = randomInt(numValues - 1);
    const col2 = randomInt(numValues - 1 - col1) + col1 + 1;
    const val1 = grid[type1][col1];
    const val2 = grid[type2][col2];
    return new DirectionRule(
      { type: type1, value: val1 },
      { type: type2, value: val2 },
    );
  }

  apply(board: Board): boolean {
    let changed = false;

    // Remove card2 from all columns up to (and including) the leftmost possible column of card1
    for (let i = 0; i < board.numValues; i++) {
      if (board.isPossible(i, this.card2)) {
        board.excludeAt(i, this.card2);
        changed = true;
      }
      if (board.isPossible(i, this.card1)) {
        break;
      }
    }

    // Remove card1 from all columns at or right of the rightmost possible column of card2
    for (let i = board.numValues - 1; i >= 0; i--) {
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
    return `${getTypeLabel(this.card1.type)}${getValueLabel(this.card1.value)} is from the left of ${getTypeLabel(this.card2.type)}${getValueLabel(this.card2.value)}`;
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
    const { grid, numTypes, numValues } = puzzle;
    const col = randomInt(numValues);
    const type = randomInt(numTypes);
    const val = grid[type][col];
    return new OpenRule({ type: type, value: val }, col);
  }

  apply(board: Board): boolean {
    if (!board.isDefined(this.col, this.card.type)) {
      board.setAt(this.col, this.card);
      return true;
    }
    return false;
  }

  getAsText() {
    return `${getTypeLabel(this.card.type)}${getValueLabel(this.card.value)} is at column ${this.col + 1}`;
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
    const { grid, numTypes, numValues } = puzzle;
    const col = randomInt(numValues);
    const type1 = randomInt(numTypes);
    const val1 = grid[type1][col];
    let type2: number;
    do {
      type2 = randomInt(numTypes);
    } while (type2 === type1);
    const val2 = grid[type2][col];
    return new UnderRule(
      { type: type1, value: val1 },
      { type: type2, value: val2 },
    );
  }

  apply(board: Board): boolean {
    let changed = false;

    for (let i = 0; i < board.numValues; i++) {
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
    return `${getTypeLabel(this.card1.type)}${getValueLabel(this.card1.value)} is the same column as ${getTypeLabel(this.card2.type)}${getValueLabel(this.card2.value)}`;
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
 * Rule: one card is located between two other cards in adjacent columns.
 * Requires at least 3 columns (numValues >= 3).
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
    const { grid, numTypes, numValues } = puzzle;
    const centertype = randomInt(numTypes);
    const type1 = randomInt(numTypes);
    const type2 = randomInt(numTypes);

    // centerCol must have a valid left and right neighbour
    const centerCol = randomInt(numValues - 2) + 1; // 1 to numValues-2
    const centerCard = { type: centertype, value: grid[centertype][centerCol] };

    let card1: Card;
    let card2: Card;
    if (randomInt(2)) {
      card1 = { type: type1, value: grid[type1][centerCol - 1] };
      card2 = { type: type2, value: grid[type2][centerCol + 1] };
    } else {
      card1 = { type: type1, value: grid[type1][centerCol + 1] };
      card2 = { type: type2, value: grid[type2][centerCol - 1] };
    }

    return new BetweenRule(card1, card2, centerCard);
  }

  apply(board: Board): boolean {
    let changed = false;

    // The center card cannot be in the first or last column
    if (board.isPossible(0, this.centerCard)) {
      changed = true;
      board.excludeAt(0, this.centerCard);
    }
    if (board.isPossible(board.numValues - 1, this.centerCard)) {
      changed = true;
      board.excludeAt(board.numValues - 1, this.centerCard);
    }

    let goodLoop: boolean;
    do {
      goodLoop = false;

      // For each interior column, check if the center card can still be placed there
      for (let i = 1; i < board.numValues - 1; i++) {
        if (board.isPossible(i, this.centerCard)) {
          const conditionA = board.isPossible(i - 1, this.card1) && board.isPossible(i + 1, this.card2);
          const conditionB = board.isPossible(i - 1, this.card2) && board.isPossible(i + 1, this.card1);
          if (!(conditionA || conditionB)) {
            board.excludeAt(i, this.centerCard);
            goodLoop = true;
          }
        }
      }

      // For each column, check if the outer cards can still satisfy the constraint
      for (let i = 0; i < board.numValues; i++) {
        let leftPossible = false;
        let rightPossible = false;

        if (board.isPossible(i, this.card2)) {
          if (i >= 2) leftPossible = board.isPossible(i - 1, this.centerCard) && board.isPossible(i - 2, this.card1);
          if (i < board.numValues - 2) rightPossible = board.isPossible(i + 1, this.centerCard) && board.isPossible(i + 2, this.card1);
          if (!leftPossible && !rightPossible) {
            board.excludeAt(i, this.card2);
            goodLoop = true;
          }
        }

        if (board.isPossible(i, this.card1)) {
          leftPossible = false;
          rightPossible = false;
          if (i >= 2) leftPossible = board.isPossible(i - 1, this.centerCard) && board.isPossible(i - 2, this.card2);
          if (i < board.numValues - 2) rightPossible = board.isPossible(i + 1, this.centerCard) && board.isPossible(i + 2, this.card2);
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
    return `${getTypeLabel(this.centerCard.type)}${getValueLabel(this.centerCard.value)} is between ${getTypeLabel(this.card1.type)}${getValueLabel(this.card1.value)} and ${getTypeLabel(this.card2.type)}${getValueLabel(this.card2.value)}`;
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
