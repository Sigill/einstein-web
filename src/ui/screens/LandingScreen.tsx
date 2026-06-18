import { h } from '../jsx';

import { Screen } from './ScreenManager.js';
import { Board } from '../../engine/Board';
import { BoardView } from '../BoardView';
import { CardValue } from '../../engine/Card.js';

export function createLandingScreen(
  onStart: (configKey: string) => void,
  onHelp: () => void,
  onHallOfFame: () => void,
): Screen {
  const container = document.createElement('div');
  container.classList.add('landing-screen');

  const title = document.createElement('h1');
  title.textContent = 'Einstein';
  container.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.classList.add('landing-subtitle');
  subtitle.textContent = 'A logic deduction puzzle — arrange cards using the hints.';
  container.appendChild(subtitle);

  const preview = <div className="landing-preview" data-puzzle-config="5x5">
    <div className="help-board-wrapper board-container"></div>
  </div> as HTMLElement;

  const previewSize = 5;
  const previewBoard = Board.create(previewSize, previewSize);
  const previewBoardView = new BoardView(previewBoard);
  for (let type = 0; type < previewBoard.numTypes; type++) {
    for (let col = 0; col < previewBoard.numValues; col++) {
      const val: CardValue = ((col + type) % 5);
      previewBoard.set(previewBoard.squares[type][col], val);
    }
  }
  preview.querySelector('.board-container')!.appendChild(previewBoardView.element);
  container.appendChild(preview);

  const form: HTMLElement = <div className="landing-form"></div>;

  const sizes: { key: string; label: string }[] = [
    { key: '4x4', label: '4 × 4' },
    { key: '5x5', label: '5 × 5' },
    { key: '6x6', label: '6 × 6' },
  ];
  for (const s of sizes) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.classList.add('landing-size');
    btn.textContent = s.label;
    btn.addEventListener('click', () => {
      onStart(s.key);
    });
    form.appendChild(btn);
  }

  container.appendChild(form);

  const controls = document.createElement('div');
  controls.classList.add('landing-controls');

  const help = <button type="button" className="secondary">How to play</button> as HTMLElement;
  help.addEventListener('click', () => onHelp());
  controls.appendChild(help);

  const hallOfFame = <button type="button" className="secondary">Hall of Fame</button> as HTMLElement;
  hallOfFame.addEventListener('click', () => onHallOfFame());
  controls.appendChild(hallOfFame);

  container.appendChild(controls);

  const screen: Screen = {
    element: container,
    name: 'landing',
    canDismissByOverlayClick: false,
    onShow() { },
    onHide() { },
  };

  return screen;
}
