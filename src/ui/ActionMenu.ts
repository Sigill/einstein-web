import { CardValue, CardType } from '../engine/Card.js';
import { createCardElement } from './CardView.js';

export interface Action {
  label: string;
  className: string;
  callback: () => void;
}

export class ActionMenu {
  private element: HTMLElement;

  constructor(
    private card: { type: CardType, value: CardValue },
    private actions: Action[],
    private onCancel: () => void
  ) {
    this.element = document.createElement('div');
    this.element.className = 'action-menu-overlay';
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.onCancel();
        this.close();
      }
    });

    const content = document.createElement('div');
    content.className = 'action-menu-content';

    const header = document.createElement('div');
    header.className = 'action-menu-header';
    header.textContent = 'Choose action';
    content.appendChild(header);

    const cardPreviewContainer = document.createElement('div');
    cardPreviewContainer.className = 'action-menu-preview-container';
    const cardPreview = createCardElement(this.card);
    cardPreview.classList.add('large', 'action-menu-preview');
    cardPreviewContainer.appendChild(cardPreview);
    content.appendChild(cardPreviewContainer);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'action-menu-buttons';

    for (const action of this.actions) {
      const btn = document.createElement('button');
      btn.className = `action-menu-btn ${action.className}`;
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        action.callback();
        this.close();
      });
      buttonsContainer.appendChild(btn);
    }

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'action-menu-btn cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      this.onCancel();
      this.close();
    });
    buttonsContainer.appendChild(cancelBtn);

    content.appendChild(buttonsContainer);
    this.element.appendChild(content);
  }

  public show(parent: HTMLElement = document.body) {
    parent.appendChild(this.element);
    // Trigger animation
    requestAnimationFrame(() => {
      this.element.classList.add('visible');
    });
  }

  public close() {
    this.element.classList.remove('visible');
    setTimeout(() => {
      if (this.element.parentElement) {
        this.element.remove();
      }
    }, 300);
  }
}
