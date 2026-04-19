import { Observable } from '../misc/observable.js';
import { Card } from './types.js';

export type HintEvents = {
  visibilityChanged: [boolean];
};

export class Hint extends Observable<HintEvents> {
  public isHidden = false;

  toggle() {
    this.isHidden = !this.isHidden;
    this.dispatchEvent('visibilityChanged', this.isHidden);
  }

  setHidden(hidden: boolean) {
    if (this.isHidden !== hidden) {
      this.isHidden = hidden;
      this.dispatchEvent('visibilityChanged', this.isHidden);
    }
  }
}

export class VerticalHint extends Hint {
  constructor(
    public readonly top: Card,
    public readonly bottom: Card
  ) {
    super();
  }
}

export type HorizontalIndicator = 'near' | 'direction';

export class HorizontalHint extends Hint {
  constructor(
    public readonly cards: Card[],
    public readonly indicator?: HorizontalIndicator
  ) {
    super();
  }
}
