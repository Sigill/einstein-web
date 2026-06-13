import { Observable } from '../misc/observable.js';
import { CardType, CardValue, Card } from './Card.js';
import { Square } from './Square.js';
import { SolvedPuzzle } from './SolvedPuzzle.js';

export type BoardEvents = {
  change: [];
};

/**
 * Represents the game grid of arbitrary size (numTypes × numValues).
 *
 * `types`  – the ordered CardType slice in use (rows).
 * `values` – the ordered CardValue slice in use (columns, always 1-based).
 *
 * `squares` is keyed by CardType; only keys present in `types` are populated.
 *
 * It manages constraints propagation systematically: when a square is validated or a candidate
 * is blacklisted, it queues these actions and resolves subsequent deductions step-by-step to
 * prevent recursion depth issues and to emit atomic events only when the board reaches a
 * steady state.
 */
export class Board extends Observable<BoardEvents> {
  public readonly numTypes: number;
  public readonly numValues: number;

  /** Squares keyed by numeric type index (0..numTypes-1). */
  public squares: Record<CardType, Square[]>;

  private isBatching = false;
  private modifiedSquares = new Set<Square>();

  /** Creates a fresh board of the given dimensions (defaults to 6×6). */
  static create(numTypes = 6, numValues = 6) {
    return new Board(numTypes, numValues);
  }

  /**
   * Reconstructs a Board from a serialized candidates array produced by `toJSON()`.
   * `numTypes` and `numValues` must match the originating board's dimensions.
   */
  static fromJSON(json: CardValue[][][], numTypes: number, numValues: number) {
    const board = new Board(numTypes, numValues);
    for (let i = 0; i < numTypes; i++) {
      for (let j = 0; j < numValues; j++) {
        const square = board.squares[i][j];
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

  private constructor(numTypes: number, numValues: number) {
    super();
    this.numTypes = numTypes;
    this.numValues = numValues;
    this.squares = {};
    for (let type = 0; type < this.numTypes; type++) {
      this.squares[type] = [];
      for (let col = 0; col < this.numValues; col++) {
        this.squares[type].push(new Square(type, col, this.numValues));
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
    for (let type = 0; type < this.numTypes; type++) {
      for (const square of this.squares[type]) {
        if (!square.isResolved()) return false;
      }
    }
    return true;
  }

  public isValid(puzzle: SolvedPuzzle): boolean {
    for (let t = 0; t < this.numTypes; t++) {
      for (let col = 0; col < this.numValues; col++) {
        if (!this.squares[t][col].candidates.has(puzzle.grid[t][col])) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Scans a row for columns that have only one candidate, or values that have only one column,
   * then validates those squares. Repeats until no more deductions can be made.
   *
   * Card values are always 1-based (1..numValues), so `val - 1` is used as a 0-based index.
   */
  private checkSingles(type: CardType) {
    const row = this.squares[type];
    // cellsCnt[col]    = number of candidates still in that column's square
    // elsCnt[val-1]    = number of squares still containing that value
    // lastValInCell[col]  = last (only) candidate seen in that cell
    // lastCellForVal[v-1] = last (only) column seen for that value
    const cellsCnt: number[] = new Array<number>(this.numValues).fill(0);
    const elsCnt: number[] = new Array<number>(this.numValues).fill(0);
    const lastValInCell: CardValue[] = new Array<CardValue>(this.numValues).fill(0);
    const lastCellForVal: number[] = new Array<number>(this.numValues).fill(0);

    for (let col = 0; col < this.numValues; col++) {
      const square = row[col];
      for (const val of square.candidates) {
        elsCnt[val]++;
        lastCellForVal[val] = col;
        cellsCnt[col]++;
        lastValInCell[col] = val;
      }
    }

    let changed = false;

    // Check for cells with a single candidate
    for (let col = 0; col < this.numValues; col++) {
      if (cellsCnt[col] === 1) {
        const val = lastValInCell[col];
        // If that value still appears in other squares, remove it from them
        if (elsCnt[val] !== 1) {
          for (let i = 0; i < this.numValues; i++) {
            if (i !== col) {
              if (row[i]._exclude(val)) {
                this.modifiedSquares.add(row[i]);
                changed = true;
              }
            }
          }
        }
        // Ensure the square is validated
        if (!row[col].isResolved()) {
          row[col]._set(val);
          this.modifiedSquares.add(row[col]);
          changed = true;
        }
      }
    }

    // Check for a value that only fits in one cell
    for (let val = 0; val < this.numValues; val++) {
      if (elsCnt[val] === 1) {
        const col = lastCellForVal[val];
        if (cellsCnt[col] !== 1) {
          // This value must be in this cell — remove other candidates
          for (const cand of Array.from(row[col].candidates)) {
            if (cand !== val) {
              if (row[col]._exclude(cand)) {
                this.modifiedSquares.add(row[col]);
                changed = true;
              }
            }
          }
        }
        // Ensure the square is validated
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

  /**
   * Applies a collection of rules in a single batch, minimizing the number of events emitted.
   */
  public applyRules(rules: Iterable<{ apply(board: Board): boolean }>) {
    this.batch(() => {
      for (const rule of rules) {
        rule.apply(this);
      }
    });
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
    return Array.from({ length: this.numTypes }, (_, t) => this.squares[t].map(square => Array.from(square.candidates)));
  }
}
