import { Board } from './engine/Board.js';
import { CardValue, ALL_TYPES, ALL_VALUES } from './engine/types.js';
import { VerticalHint, HorizontalHint } from './engine/Hint.js';
import { BoardView } from './ui/BoardView.js';
import { createVerticalHintElement, createHorizontalHintElement } from './ui/HintsView.js';

document.addEventListener('DOMContentLoaded', () => {
  const board = new Board();
  const boardView = new BoardView(board);

  document.getElementById('board-container')!.appendChild(boardView.element);

  const hintsVContainer = document.getElementById('hints-v-container')!;
  const hintsHContainer = document.getElementById('hints-h-container')!;

  const allHints: (VerticalHint | HorizontalHint)[] = [];

  function randomValue(): CardValue {
    return ALL_VALUES[Math.floor(Math.random() * ALL_VALUES.length)];
  }

  // 15 Vertical hints
  for (let i = 0; i < 15; i++) {
    const topCard = { type: ALL_TYPES[Math.floor(Math.random() * 5)], value: randomValue() };
    const bottomCard = { type: ALL_TYPES[Math.floor(Math.random() * 5) + 1], value: randomValue() };
    const hint = new VerticalHint(topCard, bottomCard);
    allHints.push(hint);
    hintsVContainer.appendChild(createVerticalHintElement(hint));
  }

  // 3x8 = 24 Horizontal hints
  for (let i = 0; i < 24; i++) {
    const isThree = Math.random() > 0.5;
    const isNear = Math.random() > 0.5;

    if (isThree) {
      const hint = new HorizontalHint([
        { type: ALL_TYPES[Math.floor(Math.random() * 6)], value: randomValue() },
        { type: ALL_TYPES[Math.floor(Math.random() * 6)], value: randomValue() },
        { type: ALL_TYPES[Math.floor(Math.random() * 6)], value: randomValue() }
      ]);
      allHints.push(hint);
      hintsHContainer.appendChild(createHorizontalHintElement(hint));
    } else {
      const hint = new HorizontalHint(
        [
          { type: ALL_TYPES[Math.floor(Math.random() * 6)], value: randomValue() },
          { type: ALL_TYPES[Math.floor(Math.random() * 6)], value: randomValue() }
        ],
        isNear ? 'near' : 'aside'
      );
      allHints.push(hint);
      hintsHContainer.appendChild(createHorizontalHintElement(hint));
    }
  }

  // Switch button toggles the visibility state of all hints by inverting them
  const btnSwitch = document.getElementById('btn-switch')!;
  btnSwitch.addEventListener('click', () => {
    for (const hint of allHints) {
      hint.setHidden(!hint.isHidden);
    }
  });
});
