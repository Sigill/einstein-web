import { Rule } from './Rules.js';
import { VisibilityObservable } from '../misc/VisibilityObservable.js';

export interface Hint {
  visibility: VisibilityObservable;
  rule: Rule;
}

export function makeHint(rule: Rule, visible: boolean = true): Hint {
  return {
    rule,
    visibility: new VisibilityObservable(visible),
  };
}
