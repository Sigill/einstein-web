import { Observable } from '../misc/observable.js';
import { CardType, CardValue, ALL_TYPES, Card } from './types.js';
import { Square } from './Square.js';
import { SolvedPuzzle } from './SolvedPuzzle.js';

export type BoardEvents = {
  change: [];
};

/**
 * Represents the 6x6 game grid.
 * It manages constraints propagation systematically: when a square is validated or a candidate is blacklisted,
 * it queues these actions and resolves subsequent deductions step-by-step to prevent recursion depth issues and
 * to emit atomic events only when the board reaches a steady state.
 */
export class Board extends Observable<BoardEvents> {
  public squares: Record<CardType, Square[]>;
  private isBatching = false;
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
    this.batch(() => {
      if (square._set(value)) {
        this.modifiedSquares.add(square);
        // Exclude this value in all other squares in the same row
        const row = this.squares[square.type];
        for (const other of row) {
          if (other !== square) {
            if (other._exclude(value)) {
              this.modifiedSquares.add(other);
            }
          }
        }
        this.checkSingles(square.type);
      }
    });
  }

  public setAt(col: number, card: Card) {
    this.set(this.squares[card.type][col], card.value);
  }

  public exclude(square: Square, value: CardValue) {
    this.batch(() => {
      if (square._exclude(value)) {
        this.modifiedSquares.add(square);
        this.checkSingles(square.type);
      }
    });
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
   * Scans the row for columns that have only one candidate, or values that have only one column.
   */
  private checkSingles(type: CardType) {
    const row = this.squares[type];
    const cellsCnt: number[] = [0, 0, 0, 0, 0, 0];
    const elsCnt: number[] = [0, 0, 0, 0, 0, 0];
    const lastValInCell: number[] = [0, 0, 0, 0, 0, 0];
    const lastCellForVal: number[] = [0, 0, 0, 0, 0, 0];

    for (let col = 0; col < 6; col++) {
      const square = row[col];
      for (const val of square.candidates) {
        const valIdx = val - 1;
        elsCnt[valIdx]++;
        lastCellForVal[valIdx] = col;
        cellsCnt[col]++;
        lastValInCell[col] = val;
      }
    }

    let changed = false;

    // Check for cells with single candidate
    for (let col = 0; col < 6; col++) {
      if (cellsCnt[col] === 1) {
        const val = lastValInCell[col] as CardValue;
        // If there is only one element in cell but it used somewhere else
        if (elsCnt[val - 1] !== 1) {
          for (let i = 0; i < 6; i++) {
            if (i !== col) {
              if (row[i]._exclude(val)) {
                this.modifiedSquares.add(row[i]);
                changed = true;
              }
            }
          }
        }
        // Ensure square value is set
        if (!row[col].isResolved()) {
          row[col]._set(val);
          this.modifiedSquares.add(row[col]);
          changed = true;
        }
      }
    }

    // Check for single card value without exclusive cell
    for (let valIdx = 0; valIdx < 6; valIdx++) {
      if (elsCnt[valIdx] === 1) {
        const col = lastCellForVal[valIdx];
        const val = (valIdx + 1) as CardValue;
        if (cellsCnt[col] !== 1) {
          // This card must be in this cell, remove other candidates
          for (const cand of Array.from(row[col].candidates)) {
            if (cand !== val) {
              if (row[col]._exclude(cand)) {
                this.modifiedSquares.add(row[col]);
                changed = true;
              }
            }
          }
        }
        // Ensure square value is set
        if (!row[col].isResolved()) {
          row[col]._set(val);
          this.modifiedSquares.add(row[col]);
          changed = true;
        }
      }
    }

    if (changed) {
      this.checkSingles(type);
    }
  }

  private batch(fn: () => void) {
    if (this.isBatching) {
      fn();
      return;
    }
    this.isBatching = true;
    try {
      fn();
    } finally {
      this.isBatching = false;
      this.fireEvents();
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
