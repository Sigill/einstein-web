import { Card, CardType, CardValue } from '../engine/types.js';

const SHAPE_SVGS: Record<CardValue, string> = {
  // Triangle Up
  1: '<svg viewBox="0 0 100 100"><polygon points="50,15 90,85 10,85" fill="currentColor"/></svg>',
  // Triangle Down
  2: '<svg viewBox="0 0 100 100"><polygon points="50,85 90,15 10,15" fill="currentColor"/></svg>',
  // Square
  3: '<svg viewBox="0 0 100 100"><rect x="20" y="20" width="60" height="60" fill="currentColor"/></svg>',
  // Diamond
  4: '<svg viewBox="0 0 100 100"><polygon points="50,15 85,50 50,85 15,50" fill="currentColor"/></svg>',
  // Pentagon Up
  5: '<svg viewBox="0 0 100 100"><polygon points="50,15 90,45 75,85 25,85 10,45" fill="currentColor"/></svg>',
  // Pentagon Down
  6: '<svg viewBox="0 0 100 100"><polygon points="50,85 90,55 75,15 25,15 10,55" fill="currentColor"/></svg>'
};

const DICE_SVGS: Record<CardValue, string> = {
  1: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="8"/><circle cx="50" cy="50" r="10" fill="currentColor"/></svg>',
  2: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="8"/><circle cx="30" cy="30" r="10" fill="currentColor"/><circle cx="70" cy="70" r="10" fill="currentColor"/></svg>',
  3: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="8"/><circle cx="30" cy="30" r="10" fill="currentColor"/><circle cx="50" cy="50" r="10" fill="currentColor"/><circle cx="70" cy="70" r="10" fill="currentColor"/></svg>',
  4: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="8"/><circle cx="30" cy="30" r="10" fill="currentColor"/><circle cx="30" cy="70" r="10" fill="currentColor"/><circle cx="70" cy="30" r="10" fill="currentColor"/><circle cx="70" cy="70" r="10" fill="currentColor"/></svg>',
  5: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="8"/><circle cx="30" cy="30" r="10" fill="currentColor"/><circle cx="30" cy="70" r="10" fill="currentColor"/><circle cx="70" cy="30" r="10" fill="currentColor"/><circle cx="70" cy="70" r="10" fill="currentColor"/><circle cx="50" cy="50" r="10" fill="currentColor"/></svg>',
  6: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="8"/><circle cx="30" cy="30" r="10" fill="currentColor"/><circle cx="30" cy="50" r="10" fill="currentColor"/><circle cx="30" cy="70" r="10" fill="currentColor"/><circle cx="70" cy="30" r="10" fill="currentColor"/><circle cx="70" cy="50" r="10" fill="currentColor"/><circle cx="70" cy="70" r="10" fill="currentColor"/></svg>'
};

const TEXT_MAP: Record<CardType, Record<CardValue, string>> = {
  A: { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6' },
  B: { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F' },
  C: { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI' },
  D: { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' }, // Handled by SVGs
  E: { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' }, // Handled by SVGs
  F: { 1: '+', 2: '-', 3: '÷', 4: '×', 5: '=', 6: '√' }
};

export function createCardElement(cardInfo: Card | { type: CardType, value: CardValue }): HTMLElement {
  const el = document.createElement('div');
  el.className = `card type-${cardInfo.type} val-${cardInfo.value}`;
  
  if (cardInfo.type === 'E') {
    el.innerHTML = SHAPE_SVGS[cardInfo.value];
    el.classList.add('shape-card');
  } else if (cardInfo.type === 'D') {
    el.innerHTML = DICE_SVGS[cardInfo.value];
    el.classList.add('dice-card');
  } else {
    el.textContent = TEXT_MAP[cardInfo.type][cardInfo.value];
  }

  return el;
}
