import { h } from '../jsx';
import { Screen } from './ScreenManager';
import { formatTime } from '../../misc/utils';

interface WinScreenProps {
  timeMs: number;
  isBest: boolean;
  bestTimeMs: number | null;
  hasUsedAssistance: boolean;
  onRestart: () => void;
}

export function createWinScreen(props: WinScreenProps): Screen {
  const element = (
    <div className="screen-container">
      <h1 style="color: #7bff7b;">{props.hasUsedAssistance ? 'Puzzle Solved!' : 'Victory!'}</h1>
      {props.hasUsedAssistance && <p style="font-size: 1.2rem; margin: 0; color: #ffeb3b; opacity: 0.8;">(with assistance)</p>}
      <p style="font-size: 2rem; margin: 10px 0;">{formatTime(props.timeMs)}</p>
      {props.isBest
        ? (
          <p style="color: #ffff7b; font-weight: bold; font-size: 1.5rem; animation: pulse 1s infinite;">
            ★ NEW PERSONAL BEST ★
          </p>
        )
        : (
          props.bestTimeMs && <p style="opacity: 0.6;">Best time: {formatTime(props.bestTimeMs)}</p>
        )}
      <p style="margin-top: 30px;">Click anywhere to play again</p>
    </div>
  ) as HTMLElement;

  return {
    element,
    name: 'win',
    canDismissByOverlayClick: true,
    onHide: () => {
      props.onRestart();
    },
  };
}
