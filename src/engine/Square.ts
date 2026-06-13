import { Observable } from '../misc/observable.js';
import { iota } from '../misc/utils.js';
import { CardType, CardValue } from './Card.js';

export type SquareEvents = {
  change: [];
  resolved: [CardValue];
};

/**
 * Represents a single cell in the game grid.
 * Tracks its remaining `candidates` and its final resolved `value`.
 * Intended to act as a model: dispatches events when candidates are excluded or a value is set.
 *
 * `allValues` defines the initial candidate set and must match the board's value pool.
 */
export class Square extends Observable<SquareEvents> {
  public value: CardValue | null = null;
  public readonly candidates: Set<CardValue>;

  constructor(
    public readonly type: CardType,
    public readonly col: number,
    numValues: number
  ) {
    super();
    this.candidates = new Set(iota(numValues));
  }

  private pendingChange = false;
  private pendingResolved: CardValue | null = null;

  // Internal mutations for the board
  _set(val: CardValue) {
    if (this.value === val) return false;
    this.value = val;
    this.candidates.clear();
    this.candidates.add(val);
    this.pendingChange = true;
    this.pendingResolved = val;
    return true;
  }

  _exclude(val: CardValue) {
    if (this.value !== null) return false;
    if (this.candidates.delete(val)) {
      this.pendingChange = true;
      return true;
    }
    return false;
  }

  _fireEvents() {
    let changed = false;
    if (this.pendingResolved !== null) {
      this.dispatchEvent('resolved', this.pendingResolved);
      this.pendingResolved = null;
    }
    if (this.pendingChange) {
      this.dispatchEvent('change');
      this.pendingChange = false;
      changed = true;
    }
    return changed;
  }

  isResolved(): boolean {
    return this.value !== null;
  }
}
