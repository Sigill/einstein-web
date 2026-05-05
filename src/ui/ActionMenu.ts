import { CardValue, CardType } from '../engine/Card.js';
import { createCardElement } from './CardView.js';

const ICONS = {
  VALIDATE: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  EXCLUDE: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
  CANCEL: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>'
};

export class ActionMenu {
  private element: HTMLElement;

  constructor(
    private card: { type: CardType, value: CardValue },
    private onValidate: () => void,
    private onExclude: () => void,
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

    const cardPreviewContainer = document.createElement('div');
    cardPreviewContainer.className = 'action-menu-preview-container';
    const cardPreview = createCardElement(this.card);
    cardPreview.classList.add('extra-large', 'action-menu-preview');
    cardPreviewContainer.appendChild(cardPreview);
    content.appendChild(cardPreviewContainer);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'action-menu-buttons';

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'action-menu-btn cancel';
    cancelBtn.innerHTML = ICONS.CANCEL;
    cancelBtn.title = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      this.onCancel();
      this.close();
    });
    buttonsContainer.appendChild(cancelBtn);

    // Exclude button
    const excludeBtn = document.createElement('button');
    excludeBtn.className = 'action-menu-btn blacklist';
    excludeBtn.innerHTML = ICONS.EXCLUDE;
    excludeBtn.title = 'Exclude';
    excludeBtn.addEventListener('click', () => {
      this.onExclude();
      this.close();
    });
    buttonsContainer.appendChild(excludeBtn);

    // Validate button
    const validateBtn = document.createElement('button');
    validateBtn.className = 'action-menu-btn validate';
    validateBtn.innerHTML = ICONS.VALIDATE;
    validateBtn.title = 'Validate';
    validateBtn.addEventListener('click', () => {
      this.onValidate();
      this.close();
    });
    buttonsContainer.appendChild(validateBtn);

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
