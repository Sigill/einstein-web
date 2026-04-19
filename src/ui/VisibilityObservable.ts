import { Observable } from '../misc/observable.js';

export type VisibilityEvents = {
  visibilityChanged: [boolean];
};

export class VisibilityObservable extends Observable<VisibilityEvents> {
  public isVisible = true;

  toggle() {
    this.isVisible = !this.isVisible;
    this.dispatchEvent('visibilityChanged', this.isVisible);
  }

  setHidden(hidden: boolean) {
    if (this.isVisible !== hidden) {
      this.isVisible = hidden;
      this.dispatchEvent('visibilityChanged', this.isVisible);
    }
  }
}
