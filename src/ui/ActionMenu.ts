import { CardValue, ALL_VALUES } from '../engine/Card.js';
import { Square } from '../engine/Square.js';
import { createCardElement } from './CardView.js';

const ICONS = {
  VALIDATE: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  EXCLUDE: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
  CANCEL: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>'
};

export class ActionMenu {
  private element: HTMLElement;
  private miniCardContainers: HTMLElement[] = [];

  constructor(
    private square: Square,
    private selectedVal: CardValue,
    private onValidate: (val: CardValue) => void,
    private onExclude: (val: CardValue) => void,
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
    cardPreviewContainer.className = 'action-menu-square-grid';

    for (const val of ALL_VALUES) {
      const container = document.createElement('div');
      container.className = 'action-menu-mini-card-container';
      this.miniCardContainers[val - 1] = container;

      if (this.square.candidates.has(val)) {
        const cardEl = createCardElement({ type: this.square.type, value: val });
        cardEl.classList.add('large');
        container.appendChild(cardEl);

        if (val === this.selectedVal) {
          container.classList.add('selected');
        }

        container.addEventListener('click', () => {
          this.selectCard(val);
        });
      }

      cardPreviewContainer.appendChild(container);
    }

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
      this.onExclude(this.selectedVal);
      this.close();
    });
    buttonsContainer.appendChild(excludeBtn);

    // Validate button
    const validateBtn = document.createElement('button');
    validateBtn.className = 'action-menu-btn validate';
    validateBtn.innerHTML = ICONS.VALIDATE;
    validateBtn.title = 'Validate';
    validateBtn.addEventListener('click', () => {
      this.onValidate(this.selectedVal);
      this.close();
    });
    buttonsContainer.appendChild(validateBtn);

    content.appendChild(buttonsContainer);
    this.element.appendChild(content);
  }

  private selectCard(val: CardValue) {
    if (val === this.selectedVal) return;

    // Remove previous selection
    const prevContainer = this.miniCardContainers[this.selectedVal - 1];
    if (prevContainer) {
      prevContainer.classList.remove('selected');
    }

    this.selectedVal = val;

    // Add new selection
    const newContainer = this.miniCardContainers[this.selectedVal - 1];
    if (newContainer) {
      newContainer.classList.add('selected');
    }
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
