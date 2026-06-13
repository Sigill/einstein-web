import { h } from '../jsx';
import { Screen } from './ScreenManager';
import { Board } from '../../engine/Board';
import { Square } from '../../engine/Square';
import { CardValue } from '../../engine/Card';
import { makeHint } from '../../engine/Hint';
import { UnderRule, NearRule, DirectionRule, BetweenRule } from '../../engine/Rules';
import { BoardView } from '../BoardView';
import { SquareView } from '../SquareView';
import { createVerticalHintElement, createHorizontalHintElement } from '../HintsView';
import { VisibilityObservable } from '../../misc/VisibilityObservable';
import { createActionContentElement } from '../ActionMenu';
import { iota } from '../../misc/utils';

export function createHelpScreen(onDismiss: () => void): Screen {
  // 1. Solved Board View
  const solvedBoard = Board.create();
  for (let type = 0; type < 6; type++) {
    for (let col = 0; col < 6; col++) {
      const val: CardValue = ((col + type) % 6);
      solvedBoard.set(solvedBoard.squares[type][col], val);
    }
  }
  const boardView = new BoardView(solvedBoard);
  const solvedBoardContainer = <div className="help-board-wrapper board-container"></div> as HTMLElement;
  solvedBoardContainer.appendChild(boardView.element);

  // 2. Square Cell View with Candidates (Excluding III)
  const cellSquare = new Square(2, 0, 6); // C corresponds to Roman numerals (index 2)
  cellSquare.candidates.delete(2); // Remove III (zero-based index 2)
  const cellBoard = Board.create();
  const squareView = new SquareView(cellSquare, cellBoard);
  const squareCellContainer = <div className="help-square-wrapper"></div> as HTMLElement;
  squareCellContainer.appendChild(squareView.element);

  // 3. Inline Action View (Touch selection menu mockup)
  const actionSquare = new Square(2, 0, 6);
  actionSquare.candidates.delete(2);
  const inlineActionView = createActionContentElement(
    actionSquare,
    2, // selected II
    iota(6),
    () => { },
    () => { }
  );
  inlineActionView.classList.add('inline-action-view');

  // 4. Vertical Stacked Hint View
  const vHint = makeHint(
    new UnderRule({ type: 2, value: 1 }, { type: 5, value: 0 }) // II and +
  );
  const vHintEl = createVerticalHintElement(vHint, new VisibilityObservable());
  const vHintWrapper = <div className="help-hint-wrapper"></div> as HTMLElement;
  vHintWrapper.appendChild(vHintEl);

  // 5. Horizontal Near Hint View
  const nearHint = makeHint(
    new NearRule({ type: 0, value: 0 }, { type: 2, value: 1 })
  );
  const nearHintEl = createHorizontalHintElement(nearHint, new VisibilityObservable());
  const nearHintWrapper = <div className="help-hint-wrapper"></div> as HTMLElement;
  nearHintWrapper.appendChild(nearHintEl);

  // 6. Horizontal Direction Hint View
  const dirHint = makeHint(
    new DirectionRule({ type: 0, value: 2 }, { type: 4, value: 3 })
  );
  const dirHintEl = createHorizontalHintElement(dirHint, new VisibilityObservable());
  const dirHintWrapper = <div className="help-hint-wrapper"></div> as HTMLElement;
  dirHintWrapper.appendChild(dirHintEl);

  // 7. Horizontal Between Hint View
  const betHint = makeHint(
    new BetweenRule({ type: 3, value: 0 }, { type: 1, value: 4 }, { type: 5, value: 5 })
  );
  const betHintEl = createHorizontalHintElement(betHint, new VisibilityObservable());
  const betHintWrapper = <div className="help-hint-wrapper"></div> as HTMLElement;
  betHintWrapper.appendChild(betHintEl);

  const container = (
    <div className="help-screen-container" style="pointer-events: auto;">
      <div className="help-screen-header">
        <h2>How to Play</h2>
        <button className="help-close-btn" onclick={onDismiss}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="help-screen-content">
        <section className="help-section">
          <p>
            The goal of the game is to open all cards in a square of 6x6 cards.
            When every card is open, the board looks like this:
          </p>
          <div className="help-center-element">
            {solvedBoardContainer}
          </div>
          <p>
            Every row of the square contains cards of one type only:
          </p>
          <ul className="help-list">
            <li><strong>Row 1</strong>: Arabic Digits (1, 2, 3, ...)</li>
            <li><strong>Row 2</strong>: Letters (A, B, C, ...)</li>
            <li><strong>Row 3</strong>: Roman Numerals (I, II, III, ...)</li>
            <li><strong>Row 4</strong>: Dice faces (⚀, ⚁, ⚂, ...)</li>
            <li><strong>Row 5</strong>: Geometric Shapes (Triangle, Square, Diamond, ...)</li>
            <li><strong>Row 6</strong>: Mathematical Symbols (+, -, ÷, ...)</li>
          </ul>
        </section>

        <section className="help-section">
          <h3>Method of Exclusion</h3>
          <p>
            Use logic and open cards with the method of exclusion. If a card is not open, the cell contains every possible candidate card. For example:
          </p>
          <div className="help-center-element">
            {squareCellContainer}
          </div>
          <p>
            means that this cell may contain every Roman numeral with the exception of <strong>III</strong> (because the card with the III image is absent).
          </p>
        </section>

        <section className="help-section">
          <h3>Controls</h3>
          <div className="help-controls-grid">
            <div className="help-block">
              <h4>Mouse Devices</h4>
              <p><strong>Left-click</strong> on a candidate to validate/open it as the only option for that cell, discarding other candidates.</p>
              <p><strong>Right-click</strong> on a candidate to exclude/blacklist it from the cell.</p>
            </div>
            <div className="help-block">
              <h4>Touchscreen Devices</h4>
              <p><strong>Tap</strong> on a candidate card to open a menu where you can select which card to act on, then choose to open/validate or exclude it:</p>
              <div className="help-center-element" style="margin-top: 15px;">
                {inlineActionView}
              </div>
            </div>
          </div>
        </section>

        <section className="help-section">
          <h3>Hints</h3>
          <p>
            Use hints to solve the puzzle. Hints are visual constraints showing relations between cards.
            You can click or tap on any hint to grey it out once you have fully resolved it.
          </p>

          <div className="help-hint-item help-block">
            <div className="description">
              <h4>Vertical Hints</h4>
              <p>Indicates that both cards are located in the <strong>same column</strong>:</p>
            </div>
            {vHintWrapper}
          </div>

          <div className="help-hint-item help-block">
            <div className="help-hint-description">
              <h4>Horizontal: Neighbour Hint</h4>
              <p>Indicates that the two cards are located in adjacent/neighbouring columns (the order is unknown):</p>
            </div>
            {nearHintWrapper}
          </div>

          <div className="help-hint-item help-block">
            <div className="description">
              <h4>Horizontal: Directional Hint</h4>
              <p>Indicates that the left card is positioned somewhere to the left of the right card (at any distance):</p>
            </div>
            {dirHintWrapper}
          </div>

          <div className="help-hint-item help-block">
            <div className="description">
              <h4>Horizontal: Between Hint</h4>
              <p>Indicates that the center card is positioned between the other two, in adjacent columns (the outer cards can be in either order):</p>
            </div>
            {betHintWrapper}
          </div>
        </section>
      </div>
    </div>
  ) as HTMLElement;

  // Stop events propagating so scrolling/clicking inside dialog does not close it
  container.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  return {
    element: container,
    name: 'help',
    canDismissByOverlayClick: true,
  };
}
