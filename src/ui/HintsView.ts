import { Hint } from '../engine/Hint.js';
import { NearRule, DirectionRule, UnderRule, BetweenRule } from '../engine/Rules.js';
import { createCardElement } from './CardView.js';
import { Card } from '../engine/Card.js';

export function createVerticalHintElement(hint: Hint): HTMLElement {
  if (!(hint.rule instanceof UnderRule)) {
    throw new Error('createVerticalHintElement expected UnderRule');
  }

  const el = document.createElement('div');
  el.className = 'hint vertical-hint';

  const topCard = createCardElement(hint.rule.card1);
  const bottomCard = createCardElement(hint.rule.card2);
  topCard.classList.add('large');
  bottomCard.classList.add('large');

  el.appendChild(topCard);
  el.appendChild(bottomCard);

  hint.visibility.addEventListener('visibilityChanged', (visible: boolean) => {
    el.classList.toggle('hidden', !visible);
  });

  el.addEventListener('click', () => {
    hint.visibility.toggle();
  });

  if (!hint.visibility.isVisible) el.classList.add('hidden');

  return el;
}

export function createHorizontalHintElement(hint: Hint): HTMLElement {
  const el = document.createElement('div');
  el.className = 'hint horizontal-hint';

  if (hint.rule instanceof NearRule) {
    const cardEl = createLargeCardEl(hint.rule.card1);
    const indicatorEl = createIndicatorElement('near');
    const cardEl2 = createLargeCardEl(hint.rule.card2);

    el.append(cardEl, indicatorEl, cardEl2);
  } else if (hint.rule instanceof DirectionRule) {
    const cardEl = createLargeCardEl(hint.rule.card1);
    const indicatorEl = createIndicatorElement('direction');
    const cardEl2 = createLargeCardEl(hint.rule.card2);

    el.append(cardEl, indicatorEl, cardEl2);
  } else if (hint.rule instanceof BetweenRule) {
    const cardEl = createLargeCardEl(hint.rule.card1);
    const centerCardEl = createLargeCardEl(hint.rule.centerCard);
    const cardEl2 = createLargeCardEl(hint.rule.card2);

    el.append(cardEl, centerCardEl, cardEl2);
  } else {
    throw new Error('createHorizontalHintElement expected NearRule, DirectionRule or BetweenRule');
  }

  hint.visibility.addEventListener('visibilityChanged', (visible: boolean) => {
    el.classList.toggle('hidden', !visible);
  });

  el.addEventListener('click', () => {
    hint.visibility.toggle();
  });

  if (!hint.visibility.isVisible) el.classList.add('hidden');

  return el;
}

function createLargeCardEl(card: Card) {
  const cardEl = createCardElement(card);
  cardEl.classList.add('large');
  return cardEl;
}

// Double-ended arrow
const NEAR_INDICATOR_SVG = '<svg viewBox="0 0 100 100"><path d="M 40 30 L 20 50 L 40 70 M 20 50 L 80 50 M 60 30 L 80 50 L 60 70" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
// Three dots
const DIRECTION_INDICATOR_SVG = '<svg viewBox="0 0 100 100"><circle cx="20" cy="50" r="8" fill="currentColor"/><circle cx="50" cy="50" r="8" fill="currentColor"/><circle cx="80" cy="50" r="8" fill="currentColor"/></svg>';

function createIndicatorElement(indicator: string) {
  const indicatorEl = document.createElement('div');
  indicatorEl.className = 'hint-indicator';
  if (indicator === 'near') {
    indicatorEl.innerHTML = NEAR_INDICATOR_SVG;
  } else if (indicator === 'direction') {
    indicatorEl.innerHTML = DIRECTION_INDICATOR_SVG;
  }
  return indicatorEl;
}
