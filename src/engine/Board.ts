import { Observable } from '../misc/observable.js';
import { CardType, CardValue, ALL_TYPES, Card } from './types.js';
import { Square } from './Square.js';
import { SolvedPuzzle } from './SolvedPuzzle.js';

export type BoardEvents = {
  change: [];
};

type Action = {
  type: 'set' | 'exclude';
  square: Square;
  value: CardValue;
};

/**
 * Represents the 6x6 game grid.
 * It manages constraints propagation systematically: when a square is validated or a candidate is blacklisted,
 * it queues these actions and resolves subsequent deductions step-by-step to prevent recursion depth issues and
 * to emit atomic events only when the board reaches a steady state.
 */
export class Board extends Observable<BoardEvents> {
  public squares: Record<CardType, Square[]>;
  private queue: Action[] = [];
  private processingQueue = false;
  private modifiedSquares = new Set<Square>();

  static create() {
    return new Board();
  }

  static fromJSON(json: CardValue[][][]) {
    const board = new Board();
    for (let i = 0; i < ALL_TYPES.length; i++) {
      for (let j = 0; j < 6; j++) {
        const square = board.squares[ALL_TYPES[i]][j];
        square.candidates.clear();
        for (const value of json[i][j]) {
          square.candidates.add(value);
        }
        if (square.candidates.size === 1) {
          square.value = square.candidates.values().next().value as CardValue;
        } else {
          square.value = null;
        }
      }
    }
    return board;
  }

  private constructor() {
    super();
    this.squares = {} as Record<CardType, Square[]>;
    for (const type of ALL_TYPES) {
      this.squares[type] = [];
      for (let col = 0; col < 6; col++) {
        this.squares[type].push(new Square(type, col));
      }
    }
  }

  public set(square: Square, value: CardValue) {
    this.queue.push({ type: 'set', square, value });
    this.processQueue();
  }

  public setAt(col: number, card: Card) {
    this.set(this.squares[card.type][col], card.value);
  }

  public exclude(square: Square, value: CardValue) {
    this.queue.push({ type: 'exclude', square, value });
    this.processQueue();
  }

  public excludeAt(col: number, card: Card) {
    this.exclude(this.squares[card.type][col], card.value);
  }

  public isPossible(col: number, card: Card): boolean {
    return this.squares[card.type][col].candidates.has(card.value);
  }

  public isDefined(col: number, type: CardType): boolean {
    return this.squares[type][col].isResolved();
  }

  public getDefined(col: number, type: CardType): CardValue | null {
    return this.squares[type][col].value;
  }

  public isSolved(): boolean {
    for (const type of ALL_TYPES) {
      for (const square of this.squares[type]) {
        if (!square.isResolved()) return false;
      }
    }
    return true;
  }

  public isValid(puzzle: SolvedPuzzle): boolean {
    for (const type of ALL_TYPES) {
      for (let col = 0; col < 6; col++) {
        if (!this.squares[type][col].candidates.has(puzzle[type][col])) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Processes all pending validations and blacklistings in a FIFO manner.
   * This queue-based approach ensures cascading logic (e.g., resolving a square triggers blacklistings
   * across its row, which may resolve other squares) completes fully before any observer is notified.
   */
  private processQueue() {
    if (this.processingQueue) return;
    this.processingQueue = true;

    try {
      while (this.queue.length > 0) {
        const action = this.queue.shift()!;
        if (action.type === 'set') {
          this.handleSet(action.square, action.value);
        } else if (action.type === 'exclude') {
          this.handleExclude(action.square, action.value);
        }
      }
    } finally {
      this.processingQueue = false;
      this.fireEvents();
    }
  }

  /**
   * Sets a square and triggers a row-wide exclusion of that value.
   */
  private handleSet(square: Square, value: CardValue) {
    if (square._set(value)) {
      this.modifiedSquares.add(square);

      // Exclude this value in all other squares in the same row
      const row = this.squares[square.type];
      for (const other of row) {
        if (other !== square) {
          this.queue.push({ type: 'exclude', square: other, value });
        }
      }
    }
  }

  /**
   * Excludes a candidate from a square and checks for immediate deductions:
   * 1. If the square has only one candidate left, validate it.
   * 2. If the removed value now only exists in one other square in the row, validate that square.
   */
  private handleExclude(square: Square, value: CardValue) {
    if (square._exclude(value)) {
      this.modifiedSquares.add(square);

      // Check if this square only has 1 candidate left
      if (square.candidates.size === 1) {
        const lastValue = square.candidates.values().next().value as CardValue;
        this.queue.push({ type: 'set', square, value: lastValue });
      }

      // Check if the removed value is now only present in exactly one square in the row
      const row = this.squares[square.type];
      const squaresWithValue = row.filter(s => s.candidates.has(value));
      if (squaresWithValue.length === 1) {
        this.queue.push({ type: 'set', square: squaresWithValue[0], value });
      } else if (squaresWithValue.length === 0) {
        // This is a contradiction state, we could handle it or log it.
        // For now, doing nothing.
      }
    }
  }

  private fireEvents() {
    let changed = false;
    for (const square of this.modifiedSquares) {
      if (square._fireEvents()) {
        changed = true;
      }
    }
    this.modifiedSquares.clear();

    if (changed) {
      this.dispatchEvent('change');
    }
  }

  toJSON(): CardValue[][][] {
    return ALL_TYPES.map(type => this.squares[type].map(square => Array.from(square.candidates)));
  }
}
