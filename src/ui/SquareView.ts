import { Square } from '../engine/Square.js';
import { Board } from '../engine/Board.js';
import { ALL_VALUES } from '../engine/Card.js';
import { createCardElement } from './CardView.js';
import { ActionMenu } from './ActionMenu.js';

export class SquareView {
  public element: HTMLElement;
  private candidatesContainer: HTMLElement;
  private resolvedContainer: HTMLElement;
  private miniCardElements: HTMLElement[] = [];

  constructor(
    private square: Square,
    private board: Board
  ) {
    this.element = document.createElement('div');
    this.element.className = `square-cell type-${square.type}`;

    this.candidatesContainer = document.createElement('div');
    this.candidatesContainer.className = 'candidates-grid';

    this.resolvedContainer = document.createElement('div');
    this.resolvedContainer.className = 'resolved-card';
    this.resolvedContainer.style.display = 'none';

    this.element.appendChild(this.candidatesContainer);
    this.element.appendChild(this.resolvedContainer);

    this.render();

    this.square.addEventListener('change', () => this.render());
  }
  private render() {
    this.miniCardElements = [];

    if (this.square.isResolved()) {
      this.candidatesContainer.style.display = 'none';
      this.resolvedContainer.style.display = 'flex';
      this.resolvedContainer.innerHTML = '';

      const cardEl = createCardElement({ type: this.square.type, value: this.square.value! });
      cardEl.classList.add('large');
      this.resolvedContainer.appendChild(cardEl);

      this.element.classList.add('resolved');
    } else {
      this.candidatesContainer.style.display = 'grid';
      this.resolvedContainer.style.display = 'none';
      this.candidatesContainer.innerHTML = '';

      this.element.classList.remove('resolved');

      for (const val of ALL_VALUES) {
        const miniCardContainer = document.createElement('div');
        miniCardContainer.className = 'mini-card-container';
        this.miniCardElements[val - 1] = miniCardContainer;

        if (this.square.candidates.has(val)) {
          const cardEl = createCardElement({ type: this.square.type, value: val });
          cardEl.classList.add('mini');

          miniCardContainer.appendChild(cardEl);

          miniCardContainer.addEventListener('click', (e) => {
            // Fallback for pointerType if browser doesn't support it well in click events
            const isTouch = e.pointerType === 'touch' || (window.matchMedia('(pointer: coarse)').matches && e.pointerType !== 'mouse');

            if (isTouch) {
              e.preventDefault();
              // Open action menu for touch
              const menu = new ActionMenu(
                { type: this.square.type, value: val },
                [
                  {
                    label: 'Validate',
                    className: 'validate',
                    callback: () => this.board.set(this.square, val),
                  },
                  {
                    label: 'Blacklist',
                    className: 'blacklist',
                    callback: () => this.board.exclude(this.square, val),
                  },
                ],
                () => { },
              );
              menu.show();
            } else if (e.button === 0) { // left click (mouse)
              this.board.set(this.square, val);
            }
          });

          miniCardContainer.addEventListener('contextmenu', (e) => {
            if (e.pointerType === 'mouse' || e.pointerType === '') {
              e.preventDefault(); // prevent native menu
              this.board.exclude(this.square, val);
            } else {
              e.preventDefault();
            }
          });
        }

        this.candidatesContainer.appendChild(miniCardContainer);
      }
    }
  }

  public getCandidateElement(val: number): HTMLElement | null {
    if (this.square.isResolved()) {
      return this.resolvedContainer.querySelector('.card') as HTMLElement;
    }
    return this.miniCardElements[val - 1] || null;
  }
}
