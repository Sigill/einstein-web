import { h } from '../jsx';
import { Screen } from './ScreenManager';
import { getBestTime } from '../../misc/BestTimes';
import { formatTime } from '../../misc/utils';

export function createHallOfFameScreen(onDismiss: () => void): Screen {
  const configs = ['4x4', '5x5', '6x6'];

  const getRowData = (config: string) => {
    const normalTime = getBestTime(false, config);
    const assistedTime = getBestTime(true, config);
    return {
      normal: normalTime !== null ? formatTime(normalTime) : '—',
      assisted: assistedTime !== null ? formatTime(assistedTime) : '—',
    };
  };

  const container = (
    <div className="hof-screen-container" style="pointer-events: auto;">
      <div className="hof-screen-header">
        <h2>★ Hall of Fame ★</h2>
        <button className="hof-close-btn" onclick={onDismiss}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="hof-screen-content">
        <p className="hof-intro">Your personal best completion times for each game configuration.</p>

        <div className="hof-grid-container">
          <table className="hof-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Standard Mode</th>
                <th>Assisted Mode</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => {
                const data = getRowData(config);
                return (
                  <tr className="hof-row">
                    <td className="hof-config-label">{config}</td>
                    <td className="hof-time-value standard">{data.normal}</td>
                    <td className="hof-time-value assisted">{data.assisted}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ) as HTMLElement;

  container.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  return {
    element: container,
    name: 'hall-of-fame',
    canDismissByOverlayClick: true,
  };
}
