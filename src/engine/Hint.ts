import { Observable } from '../misc/observable.js';
import { Rule } from './Rules.js';
import { VisibilityObservable } from '../ui/VisibilityObservable.js';

export interface Hint {
  visibility: VisibilityObservable;
  rule: Rule;
}
