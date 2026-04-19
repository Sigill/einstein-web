import { Board } from '../engine/Board.js';
import { ALL_TYPES, CardType } from '../engine/types.js';
import { SquareView } from './SquareView.js';

export class BoardView {
  public element: HTMLElement;
  private squares: SquareView[] = [];

  constructor(private board: Board) {
    this.element = document.createElement('div');
    this.element.className = 'board-grid';

    for (const type of ALL_TYPES) {
      const row = this.board.squares[type];
      for (const square of row) {
        const squareView = new SquareView(square, board);
        this.squares.push(squareView);
        this.element.appendChild(squareView.element);
      }
    }
  }

  public getSquareView(type: CardType, col: number): SquareView | null {
    const typeIndex = ALL_TYPES.indexOf(type);
    if (typeIndex === -1) return null;
    return this.squares[typeIndex * 6 + col] || null;
  }
}
