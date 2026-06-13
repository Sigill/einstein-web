import { Board } from '../engine/Board.js';
import { CardType } from '../engine/Card.js';
import { SquareView } from './SquareView.js';

export class BoardView {
  public element: DocumentFragment;
  private squares: SquareView[] = [];

  constructor(private board: Board) {
    this.element = document.createDocumentFragment();
    for (let type = 0; type < this.board.numTypes; type++) {
      const row = this.board.squares[type];
      for (const square of row) {
        const squareView = new SquareView(square, board);
        this.squares.push(squareView);
        this.element.appendChild(squareView.element);
      }
    }
  }

  public getSquareView(type: CardType, col: number): SquareView | null {
    if (type < 0 || type >= this.board.numTypes) return null;
    return this.squares[type * this.board.numValues + col] || null;
  }
}
