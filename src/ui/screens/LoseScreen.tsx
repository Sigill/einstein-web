import { h } from '../jsx';
import { Screen } from './ScreenManager';

interface LoseScreenProps {
  onRestart: () => void;
}

export function createLoseScreen(props: LoseScreenProps): Screen {
  const element = (
    <div className="screen-container">
      <h1 style="color: #ff7b7b;">Defeat</h1>
      <p>You made an impossible move.</p>
      <p style="margin-top: 30px;">Click anywhere to try again</p>
    </div>
  ) as HTMLElement;

  return {
    element,
    name: 'lose',
    canDismissByOverlayClick: true,
    onHide: () => {
      props.onRestart();
    },
  };
}
