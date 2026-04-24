import { Observable } from '../misc/observable.js';
import { CardType, CardValue, ALL_VALUES } from './types.js';

export type SquareEvents = {
  change: [];
  resolved: [CardValue];
};

/**
 * Represents a single cell in the 6x6 game grid.
 * Tracks its remaining `candidates` and its final resolved `value`.
 * Intended to act as a model: dispatches events when candidates are excluded or a value is set.
 */
export class Square extends Observable<SquareEvents> {
  public value: CardValue | null = null;

  constructor(
    public readonly type: CardType,
    public readonly col: number,
    public readonly candidates = new Set(ALL_VALUES)
  ) {
    super();
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
