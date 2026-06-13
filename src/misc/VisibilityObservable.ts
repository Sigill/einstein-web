import { Observable } from '../misc/observable.js';

export type VisibilityEvents = {
  visibilityChanged: [boolean];
};

export class VisibilityObservable extends Observable<VisibilityEvents> {
  public isVisible = true;

  constructor(visible: boolean = true) {
    super();
    this.isVisible = visible;
  }

  toggle() {
    this.isVisible = !this.isVisible;
    this.dispatchEvent('visibilityChanged', this.isVisible);
  }

  setVisible(visible: boolean) {
    if (this.isVisible !== visible) {
      this.isVisible = visible;
      this.dispatchEvent('visibilityChanged', this.isVisible);
    }
  }
}
