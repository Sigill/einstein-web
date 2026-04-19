import { Square } from '../engine/Square.js';
import { Board } from '../engine/Board.js';
import { ALL_VALUES } from '../engine/types.js';
import { createCardElement } from './CardView.js';

export class SquareView {
  public element: HTMLElement;
  private candidatesContainer: HTMLElement;
  private resolvedContainer: HTMLElement;

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

        if (this.square.candidates.has(val)) {
          const cardEl = createCardElement({ type: this.square.type, value: val });
          cardEl.classList.add('mini');

          miniCardContainer.appendChild(cardEl);

          miniCardContainer.addEventListener('click', (e) => {
            if (e.button === 0) { // left click
              this.board.validate(this.square, val);
            }
          });

          miniCardContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // prevent native menu
            this.board.blacklist(this.square, val);
          });
        }

        this.candidatesContainer.appendChild(miniCardContainer);
      }
    }
  }
}
