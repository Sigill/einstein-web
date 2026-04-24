import { h } from '../jsx';
import { Screen } from './ScreenManager';

export function createPauseScreen(): Screen {
  const element = (
    <div className="pause-screen">
      <div className="pause-content">
        <h1>Paused</h1>
        <p>Click anywhere to resume</p>
      </div>
    </div>
  ) as HTMLElement;

  return {
    element,
    name: 'pause',
    canDismissByOverlayClick: true,
  };
}
