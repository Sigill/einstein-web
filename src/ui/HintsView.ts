import { HorizontalHint, VerticalHint } from '../engine/Hint.js';
import { createCardElement } from './CardView.js';

export function createVerticalHintElement(hint: VerticalHint): HTMLElement {
  const el = document.createElement('div');
  el.className = 'hint vertical-hint';

  const topCard = createCardElement(hint.top);
  const bottomCard = createCardElement(hint.bottom);
  topCard.classList.add('large');
  bottomCard.classList.add('large');

  el.appendChild(topCard);
  el.appendChild(bottomCard);

  hint.addEventListener('visibilityChanged', (hidden) => {
    el.classList.toggle('hidden', hidden);
  });

  el.addEventListener('click', () => {
    hint.toggle();
  });

  if (hint.isHidden) el.classList.add('hidden');

  return el;
}

export function createHorizontalHintElement(hint: HorizontalHint): HTMLElement {
  const el = document.createElement('div');
  el.className = 'hint horizontal-hint';

  for (let i = 0; i < hint.cards.length; i++) {
    const cardEl = createCardElement(hint.cards[i]);
    cardEl.classList.add('large');
    el.appendChild(cardEl);
    
    // Add indicator between first and second card if it's a size-2 hint mapped to 3 spaces
    if (i === 0 && hint.indicator) {
      const indicatorEl = document.createElement('div');
      indicatorEl.className = 'hint-indicator large';
      if (hint.indicator === 'near') {
        // Double-ended arrow
        indicatorEl.innerHTML = '<svg viewBox="0 0 100 100"><path d="M 20 50 L 40 30 M 20 50 L 40 70 M 20 50 L 80 50 M 80 50 L 60 30 M 80 50 L 60 70" stroke="currentColor" stroke-width="8" fill="none"/></svg>';
      } else if (hint.indicator === 'aside') {
        // Three dots
        indicatorEl.innerHTML = '<svg viewBox="0 0 100 100"><circle cx="20" cy="50" r="8" fill="currentColor"/><circle cx="50" cy="50" r="8" fill="currentColor"/><circle cx="80" cy="50" r="8" fill="currentColor"/></svg>';
      }
      el.appendChild(indicatorEl);
    }
  }

  hint.addEventListener('visibilityChanged', (hidden) => {
    el.classList.toggle('hidden', hidden);
  });

  el.addEventListener('click', () => {
    hint.toggle();
  });

  if (hint.isHidden) el.classList.add('hidden');

  return el;
}
