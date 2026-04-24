// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from '../jsx';
import { Screen } from './ScreenManager';
import { Timer } from '../Timer';

interface WinScreenProps {
  timeMs: number;
  isBest: boolean;
  bestTimeMs: number | null;
  onRestart: () => void;
}

export function createWinScreen(props: WinScreenProps): Screen {
  const element = (
    <div className="pause-screen">
      <div className="pause-content">
        <h1 style="color: #7bff7b;">Victory!</h1>
        <p style="font-size: 2rem; margin: 10px 0;">{Timer.formatTime(props.timeMs)}</p>
        {props.isBest
          ? (
            <p style="color: #ffff7b; font-weight: bold; font-size: 1.5rem; animation: pulse 1s infinite;">
              ★ NEW PERSONAL BEST ★
            </p>
          )
          : (
            props.bestTimeMs && <p style="opacity: 0.6;">Best time: {Timer.formatTime(props.bestTimeMs)}</p>
          )}
        <p style="margin-top: 30px;">Click anywhere to play again</p>
      </div>
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
