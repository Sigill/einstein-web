import { getValueLabel } from '../engine/Card';

const SYMBOLS_BY_TYPE: string[][] = [
  ['1', '2', '3', '4', '5', '6'],
  ['A', 'B', 'C', 'D', 'E', 'F'],
  ['I', 'II', 'III', 'IV', 'V', 'VI'],
  ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'],
  ['⯅', '⯆', '■', '◆', '⬟', '⯂'],
  ['+', '-', '÷', '×', '=', '√']
];

export function getSymbol(type: number, value: number): string {
  if (type < 0 || type >= SYMBOLS_BY_TYPE.length) return getValueLabel(value);
  const row = SYMBOLS_BY_TYPE[type];
  return row[value] ?? getValueLabel(value);
}
