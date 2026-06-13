import { Card } from '../engine/Card.js';
import { getSymbol } from '../misc/symbols.js';
import { getTypeLabel, getValueLabel } from '../engine/Card.js';

const SHAPE_SVGS: { [value: number]: string } = {
  // Triangle Up
  0: '<svg viewBox="0 0 100 100"><polygon points="50,15 90,85 10,85" stroke-width="8" stroke="currentColor" fill="transparent"/></svg>',
  // Triangle Down
  1: '<svg viewBox="0 0 100 100"><polygon points="50,85 90,15 10,15" stroke-width="8" stroke="currentColor" fill="transparent"/></svg>',
  // Square
  2: '<svg viewBox="0 0 100 100"><rect x="20" y="20" width="60" height="60" stroke-width="8" stroke="currentColor" fill="transparent"/></svg>',
  // Diamond
  3: '<svg viewBox="0 0 100 100"><polygon points="50,15 85,50 50,85 15,50" stroke-width="8" stroke="currentColor" fill="transparent"/></svg>',
  // Pentagon Up
  4: '<svg viewBox="0 0 100 100"><polygon points="50,15 90,45 75,85 25,85 10,45" stroke-width="8" stroke="currentColor" fill="transparent"/></svg>',
  // Pentagon Down
  5: '<svg viewBox="0 0 100 100"><polygon points="50,85 90,55 75,15 25,15 10,55" stroke-width="8" stroke="currentColor" fill="transparent"/></svg>'
};

const DICE_SVGS: { [value: number]: string } = {
  1: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="50" cy="50" r="10" fill="currentColor"/></svg>',
  2: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="30" cy="30" r="10" fill="currentColor"/><circle cx="70" cy="70" r="10" fill="currentColor"/></svg>',
  3: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="30" cy="30" r="10" fill="currentColor"/><circle cx="50" cy="50" r="10" fill="currentColor"/><circle cx="70" cy="70" r="10" fill="currentColor"/></svg>',
  4: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="30" cy="30" r="10" fill="currentColor"/><circle cx="30" cy="70" r="10" fill="currentColor"/><circle cx="70" cy="30" r="10" fill="currentColor"/><circle cx="70" cy="70" r="10" fill="currentColor"/></svg>',
  5: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="30" cy="30" r="10" fill="currentColor"/><circle cx="30" cy="70" r="10" fill="currentColor"/><circle cx="70" cy="30" r="10" fill="currentColor"/><circle cx="70" cy="70" r="10" fill="currentColor"/><circle cx="50" cy="50" r="10" fill="currentColor"/></svg>',
  6: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="30" cy="30" r="10" fill="currentColor"/><circle cx="30" cy="50" r="10" fill="currentColor"/><circle cx="30" cy="70" r="10" fill="currentColor"/><circle cx="70" cy="30" r="10" fill="currentColor"/><circle cx="70" cy="50" r="10" fill="currentColor"/><circle cx="70" cy="70" r="10" fill="currentColor"/></svg>'
};

export function createCardElement(cardInfo: Card): HTMLElement {
  const el = document.createElement('div');
  const { type, value } = cardInfo;
  const typeLabel = getTypeLabel(type);
  const valLabel = getValueLabel(value);
  el.className = `card type-${typeLabel} val-${valLabel}`;

  if (type === 4) {
    el.innerHTML = SHAPE_SVGS[value];
    el.classList.add('shape-card');
  } else if (type === 3) {
    el.innerHTML = DICE_SVGS[value + 1];
    el.classList.add('dice-card');
  } else {
    el.textContent = getSymbol(type, value);
  }

  return el;
}
