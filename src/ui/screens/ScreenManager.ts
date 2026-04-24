export interface Screen {
  readonly element: HTMLElement;
  readonly name: string;
  readonly canDismissByOverlayClick?: boolean;
  onShow?(): void;
  onHide?(): void;
}

export type ScreenManagerCallback = (active: boolean) => void;

export class ScreenManager {
  private stack: Screen[] = [];
  private readonly overlay: HTMLElement;
  private readonly callbacks: ScreenManagerCallback[] = [];

  constructor(overlay: HTMLElement) {
    this.overlay = overlay;
    this.overlay.style.display = 'none';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.tryDismissTop();
      }
    });
  }

  onToggle(callback: ScreenManagerCallback) {
    this.callbacks.push(callback);
  }

  push(screen: Screen) {
    const wasEmpty = this.stack.length === 0;
    this.stack.push(screen);
    this.render();

    if (screen.onShow) screen.onShow();
    if (wasEmpty) {
      this.notify(true);
    }
  }

  pop() {
    if (this.stack.length === 0) return;
    const screen = this.stack.pop()!;
    if (screen.onHide) screen.onHide();

    this.render();
    if (this.stack.length === 0) {
      this.notify(false);
    }
  }

  private tryDismissTop() {
    const top = this.stack[this.stack.length - 1];
    if (top && top.canDismissByOverlayClick !== false) {
      this.pop();
    }
  }

  private render() {
    this.overlay.innerHTML = '';
    if (this.stack.length > 0) {
      const top = this.stack[this.stack.length - 1];
      this.overlay.appendChild(top.element);
      this.overlay.style.display = 'flex';
    } else {
      this.overlay.style.display = 'none';
    }
  }

  private notify(active: boolean) {
    for (const cb of this.callbacks) {
      cb(active);
    }
  }
}
