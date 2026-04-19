import { Observable } from '../misc/observable.js';
import { Rule } from './Rules.js';

export type HintEvents = {
  visibilityChanged: [boolean];
};

export class Hint extends Observable<HintEvents> {
  public isHidden = false;

  constructor(public readonly rule: Rule) {
    super();
  }

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
