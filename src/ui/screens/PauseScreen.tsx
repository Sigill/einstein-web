// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from '../jsx';
import { Screen } from './ScreenManager';

export function createPauseScreen(): Screen {
  const element = (
    <div className="screen-container">
      <h1>Paused</h1>
      <p>Click anywhere to resume</p>
    </div>
  ) as HTMLElement;

  return {
    element,
    name: 'pause',
    canDismissByOverlayClick: true,
  };
}
