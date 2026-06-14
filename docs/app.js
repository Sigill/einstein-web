// src/misc/observable.ts
var Observable = class {
  #listeners = {};
  addEventListener(eventName, listener) {
    (this.#listeners[eventName] ??= []).push(listener);
  }
  removeEventListener(eventName, listener) {
    if (this.#listeners[eventName] !== void 0) {
      const index = this.#listeners[eventName].indexOf(listener);
      if (index !== -1) {
        this.#listeners[eventName].splice(index, 1);
      }
    }
  }
  dispatchEvent(eventName, ...data) {
    if (this.#listeners[eventName] !== void 0) {
      for (const listener of this.#listeners[eventName]) {
        listener(...data);
      }
    }
  }
};

// src/misc/utils.ts
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
function randomInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}
function iota(n) {
  const values = [];
  for (let i = 0; i < n; i++) {
    values.push(i);
  }
  return values;
}

// src/engine/Square.ts
var Square = class extends Observable {
  constructor(type, col, numValues) {
    super();
    this.type = type;
    this.col = col;
    this.candidates = new Set(iota(numValues));
  }
  type;
  col;
  value = null;
  candidates;
  pendingChange = false;
  pendingResolved = null;
  // Internal mutations for the board
  _set(val) {
    if (this.value === val) return false;
    this.value = val;
    this.candidates.clear();
    this.candidates.add(val);
    this.pendingChange = true;
    this.pendingResolved = val;
    return true;
  }
  _exclude(val) {
    if (this.value !== null) return false;
    if (this.candidates.delete(val)) {
      this.pendingChange = true;
      return true;
    }
    return false;
  }
  _fireEvents() {
    let changed = false;
    if (this.pendingResolved !== null) {
      this.dispatchEvent("resolved", this.pendingResolved);
      this.pendingResolved = null;
    }
    if (this.pendingChange) {
      this.dispatchEvent("change");
      this.pendingChange = false;
      changed = true;
    }
    return changed;
  }
  isResolved() {
    return this.value !== null;
  }
};

// src/engine/Board.ts
var Board = class _Board extends Observable {
  numTypes;
  numValues;
  /** Squares keyed by numeric type index (0..numTypes-1). */
  squares;
  isBatching = false;
  modifiedSquares = /* @__PURE__ */ new Set();
  /** Creates a fresh board of the given dimensions (defaults to 6×6). */
  static create(numTypes = 6, numValues = 6) {
    return new _Board(numTypes, numValues);
  }
  /**
   * Reconstructs a Board from a serialized candidates array produced by `toJSON()`.
   * `numTypes` and `numValues` must match the originating board's dimensions.
   */
  static fromJSON(json, numTypes, numValues) {
    const board2 = new _Board(numTypes, numValues);
    for (let i = 0; i < numTypes; i++) {
      for (let j = 0; j < numValues; j++) {
        const square = board2.squares[i][j];
        square.candidates.clear();
        for (const value of json[i][j]) {
          square.candidates.add(value);
        }
        if (square.candidates.size === 1) {
          square.value = square.candidates.values().next().value;
        } else {
          square.value = null;
        }
      }
    }
    return board2;
  }
  constructor(numTypes, numValues) {
    super();
    this.numTypes = numTypes;
    this.numValues = numValues;
    this.squares = {};
    for (let type = 0; type < this.numTypes; type++) {
      this.squares[type] = [];
      for (let col = 0; col < this.numValues; col++) {
        this.squares[type].push(new Square(type, col, this.numValues));
      }
    }
  }
  set(square, value) {
    this.batch(() => {
      if (square._set(value)) {
        this.modifiedSquares.add(square);
        const row = this.squares[square.type];
        for (const other of row) {
          if (other !== square) {
            if (other._exclude(value)) {
              this.modifiedSquares.add(other);
            }
          }
        }
        this.checkSingles(square.type);
      }
    });
  }
  setAt(col, card) {
    this.set(this.squares[card.type][col], card.value);
  }
  exclude(square, value) {
    this.batch(() => {
      if (square._exclude(value)) {
        this.modifiedSquares.add(square);
        this.checkSingles(square.type);
      }
    });
  }
  excludeAt(col, card) {
    this.exclude(this.squares[card.type][col], card.value);
  }
  isPossible(col, card) {
    return this.squares[card.type][col].candidates.has(card.value);
  }
  isDefined(col, type) {
    return this.squares[type][col].isResolved();
  }
  getDefined(col, type) {
    return this.squares[type][col].value;
  }
  isSolved() {
    for (let type = 0; type < this.numTypes; type++) {
      for (const square of this.squares[type]) {
        if (!square.isResolved()) return false;
      }
    }
    return true;
  }
  isValid(puzzle2) {
    for (let t = 0; t < this.numTypes; t++) {
      for (let col = 0; col < this.numValues; col++) {
        if (!this.squares[t][col].candidates.has(puzzle2.grid[t][col])) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * Scans a row for columns that have only one candidate, or values that have only one column,
   * then validates those squares. Repeats until no more deductions can be made.
   *
   * Card values are always 1-based (1..numValues), so `val - 1` is used as a 0-based index.
   */
  checkSingles(type) {
    const row = this.squares[type];
    const cellsCnt = new Array(this.numValues).fill(0);
    const elsCnt = new Array(this.numValues).fill(0);
    const lastValInCell = new Array(this.numValues).fill(0);
    const lastCellForVal = new Array(this.numValues).fill(0);
    for (let col = 0; col < this.numValues; col++) {
      const square = row[col];
      for (const val of square.candidates) {
        elsCnt[val]++;
        lastCellForVal[val] = col;
        cellsCnt[col]++;
        lastValInCell[col] = val;
      }
    }
    let changed = false;
    for (let col = 0; col < this.numValues; col++) {
      if (cellsCnt[col] === 1) {
        const val = lastValInCell[col];
        if (elsCnt[val] !== 1) {
          for (let i = 0; i < this.numValues; i++) {
            if (i !== col) {
              if (row[i]._exclude(val)) {
                this.modifiedSquares.add(row[i]);
                changed = true;
              }
            }
          }
        }
        if (!row[col].isResolved()) {
          row[col]._set(val);
          this.modifiedSquares.add(row[col]);
          changed = true;
        }
      }
    }
    for (let val = 0; val < this.numValues; val++) {
      if (elsCnt[val] === 1) {
        const col = lastCellForVal[val];
        if (cellsCnt[col] !== 1) {
          for (const cand of Array.from(row[col].candidates)) {
            if (cand !== val) {
              if (row[col]._exclude(cand)) {
                this.modifiedSquares.add(row[col]);
                changed = true;
              }
            }
          }
        }
        if (!row[col].isResolved()) {
          row[col]._set(val);
          this.modifiedSquares.add(row[col]);
          changed = true;
        }
      }
    }
    if (changed) {
      this.checkSingles(type);
    }
  }
  /**
   * Applies a collection of rules in a single batch, minimizing the number of events emitted.
   */
  applyRules(rules) {
    this.batch(() => {
      for (const rule of rules) {
        rule.apply(this);
      }
    });
  }
  batch(fn) {
    if (this.isBatching) {
      fn();
      return;
    }
    this.isBatching = true;
    try {
      fn();
    } finally {
      this.isBatching = false;
      this.fireEvents();
    }
  }
  fireEvents() {
    let changed = false;
    for (const square of this.modifiedSquares) {
      if (square._fireEvents()) {
        changed = true;
      }
    }
    this.modifiedSquares.clear();
    if (changed) {
      this.dispatchEvent("change");
    }
  }
  toJSON() {
    return Array.from({ length: this.numTypes }, (_, t) => this.squares[t].map((square) => Array.from(square.candidates)));
  }
};

// src/misc/VisibilityObservable.ts
var VisibilityObservable = class extends Observable {
  isVisible = true;
  constructor(visible = true) {
    super();
    this.isVisible = visible;
  }
  toggle() {
    this.isVisible = !this.isVisible;
    this.dispatchEvent("visibilityChanged", this.isVisible);
  }
  setVisible(visible) {
    if (this.isVisible !== visible) {
      this.isVisible = visible;
      this.dispatchEvent("visibilityChanged", this.isVisible);
    }
  }
};

// src/engine/Hint.ts
function makeHint(rule, visible = true) {
  return {
    rule,
    visibility: new VisibilityObservable(visible)
  };
}

// src/engine/Card.ts
function getTypeLabel(idx) {
  return String.fromCharCode(65 + idx);
}
function getValueLabel(idx) {
  return `${idx + 1}`;
}
function sameCard(card1, card2) {
  return card1.type === card2.type && card1.value === card2.value;
}

// src/misc/symbols.ts
var SYMBOLS_BY_TYPE = [
  ["1", "2", "3", "4", "5", "6"],
  ["A", "B", "C", "D", "E", "F"],
  ["I", "II", "III", "IV", "V", "VI"],
  ["\u2680", "\u2681", "\u2682", "\u2683", "\u2684", "\u2685"],
  ["\u2BC5", "\u2BC6", "\u25A0", "\u25C6", "\u2B1F", "\u2BC2"],
  ["+", "-", "\xF7", "\xD7", "=", "\u221A"]
];
function getSymbol(type, value) {
  if (type < 0 || type >= SYMBOLS_BY_TYPE.length) return getValueLabel(value);
  const row = SYMBOLS_BY_TYPE[type];
  return row[value] ?? getValueLabel(value);
}

// src/ui/CardView.ts
var SHAPE_SVGS = {
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
var DICE_SVGS = {
  1: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="50" cy="50" r="10" fill="currentColor"/></svg>',
  2: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="30" cy="30" r="10" fill="currentColor"/><circle cx="70" cy="70" r="10" fill="currentColor"/></svg>',
  3: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="30" cy="30" r="10" fill="currentColor"/><circle cx="50" cy="50" r="10" fill="currentColor"/><circle cx="70" cy="70" r="10" fill="currentColor"/></svg>',
  4: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="30" cy="30" r="10" fill="currentColor"/><circle cx="30" cy="70" r="10" fill="currentColor"/><circle cx="70" cy="30" r="10" fill="currentColor"/><circle cx="70" cy="70" r="10" fill="currentColor"/></svg>',
  5: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="30" cy="30" r="10" fill="currentColor"/><circle cx="30" cy="70" r="10" fill="currentColor"/><circle cx="70" cy="30" r="10" fill="currentColor"/><circle cx="70" cy="70" r="10" fill="currentColor"/><circle cx="50" cy="50" r="10" fill="currentColor"/></svg>',
  6: '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="30" cy="30" r="10" fill="currentColor"/><circle cx="30" cy="50" r="10" fill="currentColor"/><circle cx="30" cy="70" r="10" fill="currentColor"/><circle cx="70" cy="30" r="10" fill="currentColor"/><circle cx="70" cy="50" r="10" fill="currentColor"/><circle cx="70" cy="70" r="10" fill="currentColor"/></svg>'
};
function createCardElement(cardInfo) {
  const el = document.createElement("div");
  const { type, value } = cardInfo;
  const typeLabel = getTypeLabel(type);
  const valLabel = getValueLabel(value);
  el.className = `card type-${typeLabel} val-${valLabel}`;
  if (type === 4) {
    el.innerHTML = SHAPE_SVGS[value];
    el.classList.add("shape-card");
  } else if (type === 3) {
    el.innerHTML = DICE_SVGS[value + 1];
    el.classList.add("dice-card");
  } else {
    el.textContent = getSymbol(type, value);
  }
  return el;
}

// src/ui/ActionMenu.ts
var ICONS = {
  VALIDATE: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  EXCLUDE: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
  CANCEL: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>'
};
var ActionMenu = class _ActionMenu {
  constructor(square, selectedVal, values, onValidate, onExclude, onCancel = () => {
  }) {
    this.square = square;
    this.selectedVal = selectedVal;
    this.values = values;
    this.onValidate = onValidate;
    this.onExclude = onExclude;
    this.onCancel = onCancel;
    this.element = document.createElement("div");
    this.element.className = "action-menu-overlay";
    this.element.addEventListener("click", (e) => {
      if (e.target === this.element) {
        this.onCancel();
        this.close();
      }
    });
    const content = createActionContentElement(
      square,
      selectedVal,
      values,
      (val) => {
        this.onValidate(val);
        this.close();
      },
      (val) => {
        this.onExclude(val);
        this.close();
      },
      () => {
        this.onCancel();
        this.close();
      }
    );
    this.element.appendChild(content);
  }
  square;
  selectedVal;
  values;
  onValidate;
  onExclude;
  onCancel;
  static activeInstance = null;
  static closeActive() {
    if (_ActionMenu.activeInstance) {
      _ActionMenu.activeInstance.onCancel();
      _ActionMenu.activeInstance.close();
    }
  }
  element;
  show(parent = document.body) {
    if (_ActionMenu.activeInstance && _ActionMenu.activeInstance !== this) {
      _ActionMenu.activeInstance.onCancel();
      _ActionMenu.activeInstance.close();
    }
    _ActionMenu.activeInstance = this;
    parent.appendChild(this.element);
    requestAnimationFrame(() => {
      this.element.classList.add("visible");
    });
  }
  close() {
    if (_ActionMenu.activeInstance === this) {
      _ActionMenu.activeInstance = null;
    }
    this.element.classList.remove("visible");
    setTimeout(() => {
      if (this.element.parentElement) {
        this.element.remove();
      }
    }, 300);
  }
};
function createActionContentElement(square, selectedVal, values, onValidate, onExclude, onCancel = () => {
}) {
  const content = document.createElement("div");
  content.className = "action-menu-content";
  const cardPreviewContainer = document.createElement("div");
  cardPreviewContainer.className = "action-menu-square-grid";
  const miniCardContainers = [];
  const selectCard = (val) => {
    if (val === selectedVal) return;
    const prevContainer = miniCardContainers[selectedVal];
    if (prevContainer) {
      prevContainer.classList.remove("selected");
    }
    selectedVal = val;
    const newContainer = miniCardContainers[selectedVal];
    if (newContainer) {
      newContainer.classList.add("selected");
    }
  };
  for (const val of values) {
    const container = document.createElement("div");
    container.className = "action-menu-mini-card-container";
    miniCardContainers[val] = container;
    if (square.candidates.has(val)) {
      const cardEl = createCardElement({ type: square.type, value: val });
      cardEl.classList.add("large");
      container.appendChild(cardEl);
      if (val === selectedVal) {
        container.classList.add("selected");
      }
      container.addEventListener("click", () => {
        selectCard(val);
      });
    }
    cardPreviewContainer.appendChild(container);
  }
  content.appendChild(cardPreviewContainer);
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "action-menu-buttons";
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "action-menu-btn cancel";
  cancelBtn.innerHTML = ICONS.CANCEL;
  cancelBtn.title = "Cancel";
  cancelBtn.addEventListener("click", () => {
    onCancel();
  });
  buttonsContainer.appendChild(cancelBtn);
  const excludeBtn = document.createElement("button");
  excludeBtn.className = "action-menu-btn blacklist";
  excludeBtn.innerHTML = ICONS.EXCLUDE;
  excludeBtn.title = "Exclude";
  excludeBtn.addEventListener("click", () => {
    onExclude(selectedVal);
  });
  buttonsContainer.appendChild(excludeBtn);
  const validateBtn = document.createElement("button");
  validateBtn.className = "action-menu-btn validate";
  validateBtn.innerHTML = ICONS.VALIDATE;
  validateBtn.title = "Validate";
  validateBtn.addEventListener("click", () => {
    onValidate(selectedVal);
  });
  buttonsContainer.appendChild(validateBtn);
  content.appendChild(buttonsContainer);
  return content;
}

// src/ui/SquareView.ts
var SquareView = class {
  constructor(square, board2) {
    this.square = square;
    this.board = board2;
    this.element = document.createElement("div");
    const typeLabel = getTypeLabel(square.type);
    this.element.className = `square-cell type-${typeLabel}`;
    this.candidatesContainer = document.createElement("div");
    this.candidatesContainer.className = "candidates-grid";
    this.resolvedContainer = document.createElement("div");
    this.resolvedContainer.className = "resolved-card";
    this.resolvedContainer.style.display = "none";
    this.element.appendChild(this.candidatesContainer);
    this.element.appendChild(this.resolvedContainer);
    this.render();
    this.square.addEventListener("change", () => this.render());
  }
  square;
  board;
  element;
  candidatesContainer;
  resolvedContainer;
  miniCardElements = [];
  render() {
    this.miniCardElements = [];
    if (this.square.isResolved()) {
      this.candidatesContainer.style.display = "none";
      this.resolvedContainer.style.display = "flex";
      this.resolvedContainer.innerHTML = "";
      const cardEl = createCardElement({ type: this.square.type, value: this.square.value });
      cardEl.classList.add("large");
      this.resolvedContainer.appendChild(cardEl);
      this.element.classList.add("resolved");
    } else {
      this.candidatesContainer.style.display = "";
      this.resolvedContainer.style.display = "none";
      this.candidatesContainer.innerHTML = "";
      this.element.classList.remove("resolved");
      for (let val = 0; val < this.board.numValues; val++) {
        const miniCardContainer = document.createElement("div");
        miniCardContainer.className = "mini-card-container";
        this.miniCardElements[val] = miniCardContainer;
        if (this.square.candidates.has(val)) {
          const cardEl = createCardElement({ type: this.square.type, value: val });
          cardEl.classList.add("mini");
          miniCardContainer.appendChild(cardEl);
          miniCardContainer.addEventListener("click", (e) => {
            const isTouch = e.pointerType === "touch" || window.matchMedia("(pointer: coarse)").matches && e.pointerType !== "mouse";
            if (isTouch) {
              e.preventDefault();
              const values = Array.from({ length: this.board.numValues }, (_, i) => i);
              const menu = new ActionMenu(
                this.square,
                val,
                values,
                (selectedVal) => this.board.set(this.square, selectedVal),
                (selectedVal) => this.board.exclude(this.square, selectedVal)
              );
              menu.show();
            } else if (e.button === 0) {
              this.board.set(this.square, val);
            }
          });
          miniCardContainer.addEventListener("contextmenu", (e) => {
            if (e.pointerType === "mouse" || e.pointerType === "") {
              e.preventDefault();
              this.board.exclude(this.square, val);
            } else {
              e.preventDefault();
            }
          });
        }
        this.candidatesContainer.appendChild(miniCardContainer);
      }
    }
  }
  getCandidateElement(val) {
    if (this.square.isResolved()) {
      return this.resolvedContainer.querySelector(".card");
    }
    return this.miniCardElements[val] || null;
  }
};

// src/ui/BoardView.ts
var BoardView = class {
  constructor(board2) {
    this.board = board2;
    this.element = document.createDocumentFragment();
    for (let type = 0; type < this.board.numTypes; type++) {
      const row = this.board.squares[type];
      for (const square of row) {
        const squareView = new SquareView(square, board2);
        this.squares.push(squareView);
        this.element.appendChild(squareView.element);
      }
    }
  }
  board;
  element;
  squares = [];
  getSquareView(type, col) {
    if (type < 0 || type >= this.board.numTypes) return null;
    return this.squares[type * this.board.numValues + col] || null;
  }
};

// src/engine/Rules.ts
var Rule = class {
};
var NearRule = class _NearRule extends Rule {
  card1;
  card2;
  constructor(card1, card2) {
    super();
    this.card1 = card1;
    this.card2 = card2;
  }
  static FromSolvedPuzzle(puzzle2) {
    const { grid, numTypes, numValues } = puzzle2;
    const col1 = randomInt(numValues);
    const type1 = randomInt(numTypes);
    const val1 = grid[type1][col1];
    const maxCol = numValues - 1;
    let col2;
    if (col1 === 0) col2 = 1;
    else if (col1 === maxCol) col2 = maxCol - 1;
    else col2 = randomInt(2) ? col1 + 1 : col1 - 1;
    const type2 = randomInt(numTypes);
    const val2 = grid[type2][col2];
    return new _NearRule({ type: type1, value: val1 }, { type: type2, value: val2 });
  }
  applyToCol(board2, col, nearCard, thisCard) {
    const hasLeft = col === 0 ? false : board2.isPossible(col - 1, nearCard);
    const hasRight = col === board2.numValues - 1 ? false : board2.isPossible(col + 1, nearCard);
    if (!hasRight && !hasLeft && board2.isPossible(col, thisCard)) {
      board2.excludeAt(col, thisCard);
      return true;
    }
    return false;
  }
  apply(board2) {
    let changed = false;
    for (let i = 0; i < board2.numValues; i++) {
      if (this.applyToCol(board2, i, this.card1, this.card2)) changed = true;
      if (this.applyToCol(board2, i, this.card2, this.card1)) changed = true;
    }
    if (changed) {
      this.apply(board2);
    }
    return changed;
  }
  getAsText() {
    return `${getTypeLabel(this.card1.type)}${getValueLabel(this.card1.value)} is near to ${getTypeLabel(this.card2.type)}${getValueLabel(this.card2.value)}`;
  }
  hasCard(card) {
    return sameCard(this.card1, card) || sameCard(this.card2, card);
  }
  toJSON() {
    return {
      type: "near",
      card1: this.card1,
      card2: this.card2
    };
  }
};
var DirectionRule = class _DirectionRule extends Rule {
  card1;
  card2;
  constructor(card1, card2) {
    super();
    this.card1 = card1;
    this.card2 = card2;
  }
  static FromSolvedPuzzle(puzzle2) {
    const { grid, numTypes, numValues } = puzzle2;
    const type1 = randomInt(numTypes);
    const type2 = randomInt(numTypes);
    const col1 = randomInt(numValues - 1);
    const col2 = randomInt(numValues - 1 - col1) + col1 + 1;
    const val1 = grid[type1][col1];
    const val2 = grid[type2][col2];
    return new _DirectionRule(
      { type: type1, value: val1 },
      { type: type2, value: val2 }
    );
  }
  apply(board2) {
    let changed = false;
    for (let i = 0; i < board2.numValues; i++) {
      if (board2.isPossible(i, this.card2)) {
        board2.excludeAt(i, this.card2);
        changed = true;
      }
      if (board2.isPossible(i, this.card1)) {
        break;
      }
    }
    for (let i = board2.numValues - 1; i >= 0; i--) {
      if (board2.isPossible(i, this.card1)) {
        board2.excludeAt(i, this.card1);
        changed = true;
      }
      if (board2.isPossible(i, this.card2)) {
        break;
      }
    }
    return changed;
  }
  getAsText() {
    return `${getTypeLabel(this.card1.type)}${getValueLabel(this.card1.value)} is from the left of ${getTypeLabel(this.card2.type)}${getValueLabel(this.card2.value)}`;
  }
  hasCard(card) {
    return sameCard(this.card1, card) || sameCard(this.card2, card);
  }
  toJSON() {
    return {
      type: "direction",
      card1: this.card1,
      card2: this.card2
    };
  }
  static fromJSON(json) {
    return new _DirectionRule(json.card1, json.card2);
  }
};
var OpenRule = class _OpenRule extends Rule {
  card;
  col;
  constructor(card, col) {
    super();
    this.card = card;
    this.col = col;
  }
  static FromSolvedPuzzle(puzzle2) {
    const { grid, numTypes, numValues } = puzzle2;
    const col = randomInt(numValues);
    const type = randomInt(numTypes);
    const val = grid[type][col];
    return new _OpenRule({ type, value: val }, col);
  }
  apply(board2) {
    if (!board2.isDefined(this.col, this.card.type)) {
      board2.setAt(this.col, this.card);
      return true;
    }
    return false;
  }
  getAsText() {
    return `${getTypeLabel(this.card.type)}${getValueLabel(this.card.value)} is at column ${this.col + 1}`;
  }
  hasCard(card) {
    return sameCard(this.card, card);
  }
  toJSON() {
    return {
      type: "open",
      card: this.card,
      col: this.col
    };
  }
  static fromJSON(json) {
    return new _OpenRule(json.card, json.col);
  }
};
var UnderRule = class _UnderRule extends Rule {
  card1;
  card2;
  constructor(card1, card2) {
    super();
    this.card1 = card1;
    this.card2 = card2;
  }
  static FromSolvedPuzzle(puzzle2) {
    const { grid, numTypes, numValues } = puzzle2;
    const col = randomInt(numValues);
    const type1 = randomInt(numTypes);
    const val1 = grid[type1][col];
    let type2;
    do {
      type2 = randomInt(numTypes);
    } while (type2 === type1);
    const val2 = grid[type2][col];
    return new _UnderRule(
      { type: type1, value: val1 },
      { type: type2, value: val2 }
    );
  }
  apply(board2) {
    let changed = false;
    for (let i = 0; i < board2.numValues; i++) {
      if (!board2.isPossible(i, this.card1) && board2.isPossible(i, this.card2)) {
        board2.excludeAt(i, this.card2);
        changed = true;
      }
      if (!board2.isPossible(i, this.card2) && board2.isPossible(i, this.card1)) {
        board2.excludeAt(i, this.card1);
        changed = true;
      }
    }
    return changed;
  }
  getAsText() {
    return `${getTypeLabel(this.card1.type)}${getValueLabel(this.card1.value)} is the same column as ${getTypeLabel(this.card2.type)}${getValueLabel(this.card2.value)}`;
  }
  hasCard(card) {
    return sameCard(this.card1, card) || sameCard(this.card2, card);
  }
  toJSON() {
    return {
      type: "under",
      card1: this.card1,
      card2: this.card2
    };
  }
  static fromJSON(json) {
    return new _UnderRule(json.card1, json.card2);
  }
};
var BetweenRule = class _BetweenRule extends Rule {
  card1;
  card2;
  centerCard;
  constructor(card1, card2, centerCard) {
    super();
    this.card1 = card1;
    this.card2 = card2;
    this.centerCard = centerCard;
  }
  static FromSolvedPuzzle(puzzle2) {
    const { grid, numTypes, numValues } = puzzle2;
    const centertype = randomInt(numTypes);
    const type1 = randomInt(numTypes);
    const type2 = randomInt(numTypes);
    const centerCol = randomInt(numValues - 2) + 1;
    const centerCard = { type: centertype, value: grid[centertype][centerCol] };
    let card1;
    let card2;
    if (randomInt(2)) {
      card1 = { type: type1, value: grid[type1][centerCol - 1] };
      card2 = { type: type2, value: grid[type2][centerCol + 1] };
    } else {
      card1 = { type: type1, value: grid[type1][centerCol + 1] };
      card2 = { type: type2, value: grid[type2][centerCol - 1] };
    }
    return new _BetweenRule(card1, card2, centerCard);
  }
  apply(board2) {
    let changed = false;
    if (board2.isPossible(0, this.centerCard)) {
      changed = true;
      board2.excludeAt(0, this.centerCard);
    }
    if (board2.isPossible(board2.numValues - 1, this.centerCard)) {
      changed = true;
      board2.excludeAt(board2.numValues - 1, this.centerCard);
    }
    let goodLoop;
    do {
      goodLoop = false;
      for (let i = 1; i < board2.numValues - 1; i++) {
        if (board2.isPossible(i, this.centerCard)) {
          const conditionA = board2.isPossible(i - 1, this.card1) && board2.isPossible(i + 1, this.card2);
          const conditionB = board2.isPossible(i - 1, this.card2) && board2.isPossible(i + 1, this.card1);
          if (!(conditionA || conditionB)) {
            board2.excludeAt(i, this.centerCard);
            goodLoop = true;
          }
        }
      }
      for (let i = 0; i < board2.numValues; i++) {
        let leftPossible = false;
        let rightPossible = false;
        if (board2.isPossible(i, this.card2)) {
          if (i >= 2) leftPossible = board2.isPossible(i - 1, this.centerCard) && board2.isPossible(i - 2, this.card1);
          if (i < board2.numValues - 2) rightPossible = board2.isPossible(i + 1, this.centerCard) && board2.isPossible(i + 2, this.card1);
          if (!leftPossible && !rightPossible) {
            board2.excludeAt(i, this.card2);
            goodLoop = true;
          }
        }
        if (board2.isPossible(i, this.card1)) {
          leftPossible = false;
          rightPossible = false;
          if (i >= 2) leftPossible = board2.isPossible(i - 1, this.centerCard) && board2.isPossible(i - 2, this.card2);
          if (i < board2.numValues - 2) rightPossible = board2.isPossible(i + 1, this.centerCard) && board2.isPossible(i + 2, this.card2);
          if (!leftPossible && !rightPossible) {
            board2.excludeAt(i, this.card1);
            goodLoop = true;
          }
        }
      }
      if (goodLoop) {
        changed = true;
      }
    } while (goodLoop);
    return changed;
  }
  getAsText() {
    return `${getTypeLabel(this.centerCard.type)}${getValueLabel(this.centerCard.value)} is between ${getTypeLabel(this.card1.type)}${getValueLabel(this.card1.value)} and ${getTypeLabel(this.card2.type)}${getValueLabel(this.card2.value)}`;
  }
  hasCard(card) {
    return sameCard(this.card1, card) || sameCard(this.card2, card) || sameCard(this.centerCard, card);
  }
  toJSON() {
    return {
      type: "between",
      card1: this.card1,
      card2: this.card2,
      centerCard: this.centerCard
    };
  }
  static fromJSON(json) {
    return new _BetweenRule(json.card1, json.card2, json.centerCard);
  }
};
function printRules(rules) {
  for (const rule of rules) {
    console.log(rule.getAsText());
  }
}
function ruleFromJSON(json) {
  const data = json;
  switch (data.type) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    case "near":
      return new NearRule(json.card1, json.card2);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    case "direction":
      return new DirectionRule(json.card1, json.card2);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    case "open":
      return new OpenRule(json.card, json.col);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    case "under":
      return new UnderRule(json.card1, json.card2);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    case "between":
      return new BetweenRule(json.card1, json.card2, json.centerCard);
    default:
      throw new Error(`Unknown rule type ${String(data.type)}`);
  }
}

// src/ui/HintsView.ts
function createVerticalHintElement(hint, hintViewVisibility2) {
  if (!(hint.rule instanceof UnderRule)) {
    throw new Error("createVerticalHintElement expected UnderRule");
  }
  const el = document.createElement("div");
  el.className = "hint vertical-hint";
  const topCard = createCardElement(hint.rule.card1);
  const bottomCard = createCardElement(hint.rule.card2);
  topCard.classList.add("large");
  bottomCard.classList.add("large");
  el.appendChild(topCard);
  el.appendChild(bottomCard);
  const updateVisibility = () => {
    const isHidden = hint.visibility.isVisible !== hintViewVisibility2.isVisible;
    el.classList.toggle("hidden", isHidden);
  };
  hint.visibility.addEventListener("visibilityChanged", updateVisibility);
  hintViewVisibility2.addEventListener("visibilityChanged", updateVisibility);
  el.addEventListener("click", () => {
    hint.visibility.toggle();
  });
  updateVisibility();
  return el;
}
function createHorizontalHintElement(hint, hintViewVisibility2) {
  const el = document.createElement("div");
  el.className = "hint horizontal-hint";
  if (hint.rule instanceof NearRule) {
    const cardEl = createLargeCardEl(hint.rule.card1);
    const indicatorEl = createIndicatorElement("near");
    const cardEl2 = createLargeCardEl(hint.rule.card2);
    el.append(cardEl, indicatorEl, cardEl2);
  } else if (hint.rule instanceof DirectionRule) {
    const cardEl = createLargeCardEl(hint.rule.card1);
    const indicatorEl = createIndicatorElement("direction");
    const cardEl2 = createLargeCardEl(hint.rule.card2);
    el.append(cardEl, indicatorEl, cardEl2);
  } else if (hint.rule instanceof BetweenRule) {
    const cardEl = createLargeCardEl(hint.rule.card1);
    const centerCardEl = createLargeCardEl(hint.rule.centerCard);
    const cardEl2 = createLargeCardEl(hint.rule.card2);
    el.append(cardEl, centerCardEl, cardEl2);
  } else {
    throw new Error("createHorizontalHintElement expected NearRule, DirectionRule or BetweenRule");
  }
  const updateVisibility = () => {
    const isHidden = hint.visibility.isVisible !== hintViewVisibility2.isVisible;
    el.classList.toggle("hidden", isHidden);
  };
  hint.visibility.addEventListener("visibilityChanged", updateVisibility);
  hintViewVisibility2.addEventListener("visibilityChanged", updateVisibility);
  el.addEventListener("click", () => {
    hint.visibility.toggle();
  });
  updateVisibility();
  return el;
}
function createLargeCardEl(card) {
  const cardEl = createCardElement(card);
  cardEl.classList.add("large");
  return cardEl;
}
var NEAR_INDICATOR_SVG = '<svg viewBox="0 0 100 100"><path d="M 40 30 L 20 50 L 40 70 M 20 50 L 80 50 M 60 30 L 80 50 L 60 70" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
var DIRECTION_INDICATOR_SVG = '<svg viewBox="0 0 100 100"><circle cx="20" cy="50" r="8" fill="currentColor"/><circle cx="50" cy="50" r="8" fill="currentColor"/><circle cx="80" cy="50" r="8" fill="currentColor"/></svg>';
function createIndicatorElement(indicator) {
  const indicatorEl = document.createElement("div");
  indicatorEl.className = "hint-indicator";
  if (indicator === "near") {
    indicatorEl.innerHTML = NEAR_INDICATOR_SVG;
  } else if (indicator === "direction") {
    indicatorEl.innerHTML = DIRECTION_INDICATOR_SVG;
  }
  return indicatorEl;
}

// src/engine/SolvedPuzzle.ts
function printPuzzle(puzzle2) {
  for (let i = 0; i < puzzle2.numTypes; i++) {
    const labels = puzzle2.grid[i].map((v) => getValueLabel(v));
    const typeLabel = getTypeLabel(i);
    console.log(`${typeLabel}: ${labels.join(", ")}`);
  }
}
function generateRandomSolvedPuzzle(numTypes = 6, numValues = 6) {
  const values = iota(numValues);
  const grid = Array.from({ length: numTypes }, () => {
    const row = [...values];
    shuffleArray(row);
    return row;
  });
  return { numTypes, numValues, grid };
}
function toJSON(puzzle2) {
  return { numTypes: puzzle2.numTypes, numValues: puzzle2.numValues, grid: puzzle2.grid };
}
function fromJSON(json) {
  return { numTypes: json.numTypes, numValues: json.numValues, grid: json.grid };
}

// src/engine/PuzzleGenerator.ts
function genRule(puzzle2) {
  const a = Math.floor(Math.random() * 14);
  switch (a) {
    case 0:
    case 1:
    case 2:
    case 3:
      return NearRule.FromSolvedPuzzle(puzzle2);
    case 4:
      return OpenRule.FromSolvedPuzzle(puzzle2);
    case 5:
    case 6:
      return UnderRule.FromSolvedPuzzle(puzzle2);
    case 7:
    case 8:
    case 9:
    case 10:
      return DirectionRule.FromSolvedPuzzle(puzzle2);
    case 11:
    case 12:
    case 13:
      return BetweenRule.FromSolvedPuzzle(puzzle2);
    default:
      return genRule(puzzle2);
  }
}
function canSolve(puzzle2, rules) {
  const numTypes = puzzle2.numTypes;
  const numValues = puzzle2.numValues;
  const board2 = Board.create(numTypes, numValues);
  let changed;
  do {
    changed = false;
    for (const rule of rules) {
      if (rule.apply(board2)) {
        changed = true;
        if (!board2.isValid(puzzle2)) {
          throw new Error("Invalid possibilities after applying rule: " + rule.getAsText());
        }
      }
    }
  } while (changed);
  return board2.isSolved();
}
function removeRules(puzzle2, rules, { verbose = false } = {}) {
  if (verbose) console.groupCollapsed("Removing rules");
  let possible;
  do {
    possible = false;
    for (let i = 0; i < rules.length; i++) {
      if (canSolve(puzzle2, rules.toSpliced(i, 1))) {
        possible = true;
        if (verbose) console.log(`Removing rule: ${rules[i].getAsText()}`);
        rules.splice(i, 1);
        break;
      }
    }
  } while (possible);
  if (verbose) console.groupEnd();
}
function generateRules(puzzle2, rules) {
  let rulesDone = false;
  do {
    const rule = genRule(puzzle2);
    const ruleText = rule.getAsText();
    if (rules.some((r) => r.getAsText() === ruleText)) {
      continue;
    }
    rules.push(rule);
    rulesDone = canSolve(puzzle2, rules);
  } while (!rulesDone);
}
function generatePuzzle(numTypes = 6, numValues = 6, { verbose = false } = {}) {
  const puzzle2 = generateRandomSolvedPuzzle(numTypes, numValues);
  if (verbose) {
    printPuzzle(puzzle2);
  }
  const rules = [];
  generateRules(puzzle2, rules);
  if (verbose) {
    console.groupCollapsed(`${rules.length} rules generated`);
    printRules(rules);
    console.groupEnd();
  }
  removeRules(puzzle2, rules, { verbose });
  if (verbose) {
    console.group("Final rules");
    printRules(rules);
    console.groupEnd();
  }
  return { puzzle: puzzle2, rules };
}
function countHints(rules) {
  let horizontal = 0;
  let vertical = 0;
  for (const rule of rules) {
    if (rule instanceof UnderRule) {
      vertical++;
    } else if (rule instanceof NearRule || rule instanceof DirectionRule || rule instanceof BetweenRule) {
      horizontal++;
    }
  }
  return { horizontal, vertical };
}
function generatePuzzleWithAcceptableAmountOfHints({ numTypes, numValues, limits }) {
  console.group("Generating solvable puzzle");
  do {
    const { puzzle: puzzle2, rules } = generatePuzzle(numTypes, numValues);
    const hints2 = countHints(rules);
    console.log(`Puzzle has ${hints2.horizontal} horizontal and ${hints2.vertical} vertical hints`);
    if (hints2.horizontal <= limits.horizontal && hints2.vertical <= limits.vertical) {
      console.groupEnd();
      return { puzzle: puzzle2, rules };
    }
    console.groupEnd();
  } while (true);
}

// src/ui/HintUtils.ts
function findFirstApplicableHint(board2, hints2) {
  const candidates = [
    ...hints2.filter((h2) => h2.visibility.isVisible),
    ...hints2.filter((h2) => !h2.visibility.isVisible)
  ];
  for (const hint of candidates) {
    if (hint.rule instanceof OpenRule) continue;
    const tempBoard = Board.fromJSON(board2, board2.length, board2[0].length);
    if (hint.rule.apply(tempBoard)) {
      return hint;
    }
  }
  return null;
}
function findFirstDiff(oldState, newState, rule) {
  const allDiffs = [];
  const resolvedDiffs = [];
  const numTypes = oldState.length;
  for (let t = 0; t < numTypes; t++) {
    const numValues = oldState[t].length;
    for (let c = 0; c < numValues; c++) {
      const oldCands = oldState[t][c];
      const newCands = newState[t][c];
      if (oldCands.length !== newCands.length) {
        if (newCands.length === 1 && oldCands.length > 1) {
          resolvedDiffs.push({ type: t, col: c, value: newCands[0] });
        }
        for (const v of oldCands) {
          if (!newCands.includes(v)) {
            allDiffs.push({ type: t, col: c, value: v });
          }
        }
      }
    }
  }
  if (allDiffs.length === 0 && resolvedDiffs.length === 0) return null;
  for (const rd of resolvedDiffs) {
    if (rule.hasCard(rd)) {
      return rd;
    }
  }
  for (const diff of allDiffs) {
    if (rule.hasCard(diff)) {
      return diff;
    }
  }
  if (resolvedDiffs.length > 0) return resolvedDiffs[0];
  return allDiffs[0];
}
function blinkHint(hint, hintToElement2) {
  const el = hintToElement2.get(hint);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("blink");
    el.offsetWidth;
    el.classList.add("blink");
    setTimeout(() => el.classList.remove("blink"), 2e3);
  }
}
function blinkSquareCandidate(boardView2, { type, value, col }) {
  const sv = boardView2.getSquareView(type, col);
  const cardEl = sv?.getCandidateElement(value);
  if (cardEl) {
    cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
    cardEl.classList.remove("blink");
    cardEl.offsetWidth;
    cardEl.classList.add("blink");
    setTimeout(() => cardEl.classList.remove("blink"), 2e3);
  }
}

// src/ui/screens/ScreenManager.ts
var ScreenManager = class {
  stack = [];
  overlay;
  callbacks = [];
  constructor(overlay) {
    this.overlay = overlay;
    this.overlay.style.display = "none";
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this.tryDismissTop();
      }
    });
  }
  onToggle(callback) {
    this.callbacks.push(callback);
  }
  push(screen) {
    const wasEmpty = this.stack.length === 0;
    this.stack.push(screen);
    this.render();
    if (screen.onShow) screen.onShow();
    if (wasEmpty) {
      this.notify(true);
    }
  }
  pop() {
    if (this.stack.length === 0) return;
    const screen = this.stack.pop();
    if (screen.onHide) screen.onHide();
    this.render();
    if (this.stack.length === 0) {
      this.notify(false);
    }
  }
  tryDismissTop() {
    const top = this.stack[this.stack.length - 1];
    if (top && top.canDismissByOverlayClick !== false) {
      this.pop();
    }
  }
  render() {
    this.overlay.innerHTML = "";
    if (this.stack.length > 0) {
      const top = this.stack[this.stack.length - 1];
      this.overlay.appendChild(top.element);
      this.overlay.style.display = "flex";
    } else {
      this.overlay.style.display = "none";
    }
  }
  notify(active) {
    for (const cb of this.callbacks) {
      cb(active);
    }
  }
};

// src/ui/jsx.tsx
var SVG_TAGS = /* @__PURE__ */ new Set(["svg", "path", "circle", "rect", "line", "text", "g", "defs", "title", "desc", "symbol", "use"]);
function h(tag, props, ...children) {
  if (typeof tag === "function") {
    return tag({ ...props || {}, children });
  }
  const is_svg = SVG_TAGS.has(tag);
  const element = is_svg ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === "className") {
        element.classList.add(...value.split(" "));
      } else if (is_svg || key.startsWith("data-")) {
        element.setAttribute(key, value);
      } else if (key === "style" && typeof value === "object") {
        Object.assign(element.style, value);
      } else {
        element[key] = value;
      }
    }
  }
  for (const child of children) {
    if (child === null || child === void 0 || child === false) {
      continue;
    }
    if (Array.isArray(child)) {
      for (const c of child) {
        element.append(typeof c === "object" ? c : String(c));
      }
    } else {
      element.append(typeof child === "object" ? child : String(child));
    }
  }
  return element;
}

// src/ui/screens/LandingScreen.tsx
function createLandingScreen(onStart, onHelp) {
  const container = document.createElement("div");
  container.classList.add("landing-screen");
  const title = document.createElement("h1");
  title.textContent = "Einstein";
  container.appendChild(title);
  const subtitle = document.createElement("p");
  subtitle.classList.add("landing-subtitle");
  subtitle.textContent = "A logic deduction puzzle \u2014 arrange cards using the hints.";
  container.appendChild(subtitle);
  const preview = /* @__PURE__ */ h("div", { className: "landing-preview", "data-puzzle-config": "5x5" }, /* @__PURE__ */ h("div", { className: "help-board-wrapper board-container" }));
  let previewSize = 5;
  let previewBoard = Board.create(previewSize, previewSize);
  const previewBoardView = new BoardView(previewBoard);
  for (let type = 0; type < previewBoard.numTypes; type++) {
    for (let col = 0; col < previewBoard.numValues; col++) {
      const val = (col + type) % 5;
      previewBoard.set(previewBoard.squares[type][col], val);
    }
  }
  preview.querySelector(".board-container").appendChild(previewBoardView.element);
  container.appendChild(preview);
  const form = /* @__PURE__ */ h("div", { className: "landing-form" });
  const sizes = [
    { key: "4x4", label: "4 \xD7 4" },
    { key: "5x5", label: "5 \xD7 5" },
    { key: "6x6", label: "6 \xD7 6" }
  ];
  for (const s of sizes) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.add("landing-size");
    btn.textContent = s.label;
    btn.addEventListener("click", () => {
      onStart(s.key);
    });
    form.appendChild(btn);
  }
  container.appendChild(form);
  const controls = document.createElement("div");
  controls.classList.add("landing-controls");
  const help = document.createElement("button");
  help.type = "button";
  help.classList.add("secondary");
  help.textContent = "How to play";
  help.addEventListener("click", () => onHelp());
  controls.appendChild(help);
  container.appendChild(controls);
  const screen = {
    element: container,
    name: "landing",
    canDismissByOverlayClick: false,
    onShow() {
    },
    onHide() {
    }
  };
  return screen;
}

// src/ui/screens/PauseScreen.tsx
function createPauseScreen() {
  const element = /* @__PURE__ */ h("div", { className: "screen-container" }, /* @__PURE__ */ h("h1", null, "Paused"), /* @__PURE__ */ h("p", null, "Click anywhere to resume"));
  return {
    element,
    name: "pause",
    canDismissByOverlayClick: true
  };
}

// src/ui/Timer.ts
var Timer = class _Timer {
  startTime = 0;
  elapsedTime = 0;
  timerInterval = null;
  displayElement;
  constructor(displayElement) {
    this.displayElement = displayElement;
  }
  start() {
    if (this.timerInterval !== null) return;
    this.startTime = performance.now() - this.elapsedTime;
    this.timerInterval = window.setInterval(() => {
      this.elapsedTime = performance.now() - this.startTime;
      this.updateDisplay();
    }, 1e3);
  }
  pause() {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
  stop() {
    this.pause();
  }
  reset() {
    this.stop();
    this.elapsedTime = 0;
    this.updateDisplay();
  }
  getElapsedTime() {
    return this.elapsedTime;
  }
  static formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1e3);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds % 3600 / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((v) => v.toString().padStart(2, "0")).join(":");
  }
  updateDisplay() {
    this.displayElement.textContent = _Timer.formatTime(this.elapsedTime);
  }
  saveBestTime(withAssistance, configKey = "") {
    const key = localstorageKey(withAssistance, configKey);
    const currentBest = localStorage.getItem(key);
    if (!currentBest || this.elapsedTime < parseInt(currentBest, 10)) {
      localStorage.setItem(key, this.elapsedTime.toString());
      return true;
    }
    return false;
  }
  getBestTime(withAssistance, configKey) {
    const key = localstorageKey(withAssistance, configKey);
    const best = localStorage.getItem(key);
    return best ? parseInt(best, 10) : null;
  }
};
function localstorageKey(withAssistance, configKey) {
  const base = withAssistance ? "einstein-best-time-assisted" : "einstein-best-time";
  return configKey ? `${base}-${configKey}` : base;
}

// src/ui/screens/WinScreen.tsx
function createWinScreen(props) {
  const element = /* @__PURE__ */ h("div", { className: "screen-container" }, /* @__PURE__ */ h("h1", { style: "color: #7bff7b;" }, props.hasUsedAssistance ? "Puzzle Solved!" : "Victory!"), props.hasUsedAssistance && /* @__PURE__ */ h("p", { style: "font-size: 1.2rem; margin: 0; color: #ffeb3b; opacity: 0.8;" }, "(with assistance)"), /* @__PURE__ */ h("p", { style: "font-size: 2rem; margin: 10px 0;" }, Timer.formatTime(props.timeMs)), props.isBest ? /* @__PURE__ */ h("p", { style: "color: #ffff7b; font-weight: bold; font-size: 1.5rem; animation: pulse 1s infinite;" }, "\u2605 NEW PERSONAL BEST \u2605") : props.bestTimeMs && /* @__PURE__ */ h("p", { style: "opacity: 0.6;" }, "Best time: ", Timer.formatTime(props.bestTimeMs)), /* @__PURE__ */ h("p", { style: "margin-top: 30px;" }, "Click anywhere to play again"));
  return {
    element,
    name: "win",
    canDismissByOverlayClick: true,
    onHide: () => {
      props.onRestart();
    }
  };
}

// src/ui/screens/LoseScreen.tsx
function createLoseScreen(props) {
  const element = /* @__PURE__ */ h("div", { className: "screen-container" }, /* @__PURE__ */ h("h1", { style: "color: #ff7b7b;" }, "Defeat"), /* @__PURE__ */ h("p", null, "You made an impossible move."), /* @__PURE__ */ h("p", { style: "margin-top: 30px;" }, "Click anywhere to try again"));
  return {
    element,
    name: "lose",
    canDismissByOverlayClick: true,
    onHide: () => {
      props.onRestart();
    }
  };
}

// src/ui/screens/HelpScreen.tsx
function createHelpScreen(onDismiss) {
  const solvedBoard = Board.create();
  for (let type = 0; type < 6; type++) {
    for (let col = 0; col < 6; col++) {
      const val = (col + type) % 6;
      solvedBoard.set(solvedBoard.squares[type][col], val);
    }
  }
  const boardView2 = new BoardView(solvedBoard);
  const solvedBoardContainer = /* @__PURE__ */ h("div", { className: "help-board-wrapper board-container" });
  solvedBoardContainer.appendChild(boardView2.element);
  const cellSquare = new Square(2, 0, 6);
  cellSquare.candidates.delete(2);
  const cellBoard = Board.create();
  const squareView = new SquareView(cellSquare, cellBoard);
  const squareCellContainer = /* @__PURE__ */ h("div", { className: "help-square-wrapper" });
  squareCellContainer.appendChild(squareView.element);
  const actionSquare = new Square(2, 0, 6);
  actionSquare.candidates.delete(2);
  const inlineActionView = createActionContentElement(
    actionSquare,
    2,
    // selected II
    iota(6),
    () => {
    },
    () => {
    }
  );
  inlineActionView.classList.add("inline-action-view");
  const vHint = makeHint(
    new UnderRule({ type: 2, value: 1 }, { type: 5, value: 0 })
    // II and +
  );
  const vHintEl = createVerticalHintElement(vHint, new VisibilityObservable());
  const vHintWrapper = /* @__PURE__ */ h("div", { className: "help-hint-wrapper" });
  vHintWrapper.appendChild(vHintEl);
  const nearHint = makeHint(
    new NearRule({ type: 0, value: 0 }, { type: 2, value: 1 })
  );
  const nearHintEl = createHorizontalHintElement(nearHint, new VisibilityObservable());
  const nearHintWrapper = /* @__PURE__ */ h("div", { className: "help-hint-wrapper" });
  nearHintWrapper.appendChild(nearHintEl);
  const dirHint = makeHint(
    new DirectionRule({ type: 0, value: 2 }, { type: 4, value: 3 })
  );
  const dirHintEl = createHorizontalHintElement(dirHint, new VisibilityObservable());
  const dirHintWrapper = /* @__PURE__ */ h("div", { className: "help-hint-wrapper" });
  dirHintWrapper.appendChild(dirHintEl);
  const betHint = makeHint(
    new BetweenRule({ type: 3, value: 0 }, { type: 1, value: 4 }, { type: 5, value: 5 })
  );
  const betHintEl = createHorizontalHintElement(betHint, new VisibilityObservable());
  const betHintWrapper = /* @__PURE__ */ h("div", { className: "help-hint-wrapper" });
  betHintWrapper.appendChild(betHintEl);
  const container = /* @__PURE__ */ h("div", { className: "help-screen-container", style: "pointer-events: auto;" }, /* @__PURE__ */ h("div", { className: "help-screen-header" }, /* @__PURE__ */ h("h2", null, "How to Play"), /* @__PURE__ */ h("button", { className: "help-close-btn", onclick: onDismiss }, /* @__PURE__ */ h("svg", { viewBox: "0 0 24 24", width: "24", height: "24", stroke: "currentColor", "stroke-width": "2.5", fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), /* @__PURE__ */ h("line", { x1: "6", y1: "6", x2: "18", y2: "18" })))), /* @__PURE__ */ h("div", { className: "help-screen-content" }, /* @__PURE__ */ h("section", { className: "help-section" }, /* @__PURE__ */ h("p", null, "The goal of the game is to open all cards in a square of 6x6 cards. When every card is open, the board looks like this:"), /* @__PURE__ */ h("div", { className: "help-center-element" }, solvedBoardContainer), /* @__PURE__ */ h("p", null, "Every row of the square contains cards of one type only:"), /* @__PURE__ */ h("ul", { className: "help-list" }, /* @__PURE__ */ h("li", null, /* @__PURE__ */ h("strong", null, "Row 1"), ": Arabic Digits (1, 2, 3, ...)"), /* @__PURE__ */ h("li", null, /* @__PURE__ */ h("strong", null, "Row 2"), ": Letters (A, B, C, ...)"), /* @__PURE__ */ h("li", null, /* @__PURE__ */ h("strong", null, "Row 3"), ": Roman Numerals (I, II, III, ...)"), /* @__PURE__ */ h("li", null, /* @__PURE__ */ h("strong", null, "Row 4"), ": Dice faces (\u2680, \u2681, \u2682, ...)"), /* @__PURE__ */ h("li", null, /* @__PURE__ */ h("strong", null, "Row 5"), ": Geometric Shapes (Triangle, Square, Diamond, ...)"), /* @__PURE__ */ h("li", null, /* @__PURE__ */ h("strong", null, "Row 6"), ": Mathematical Symbols (+, -, \xF7, ...)"))), /* @__PURE__ */ h("section", { className: "help-section" }, /* @__PURE__ */ h("h3", null, "Method of Exclusion"), /* @__PURE__ */ h("p", null, "Use logic and open cards with the method of exclusion. If a card is not open, the cell contains every possible candidate card. For example:"), /* @__PURE__ */ h("div", { className: "help-center-element" }, squareCellContainer), /* @__PURE__ */ h("p", null, "means that this cell may contain every Roman numeral with the exception of ", /* @__PURE__ */ h("strong", null, "III"), " (because the card with the III image is absent).")), /* @__PURE__ */ h("section", { className: "help-section" }, /* @__PURE__ */ h("h3", null, "Controls"), /* @__PURE__ */ h("div", { className: "help-controls-grid" }, /* @__PURE__ */ h("div", { className: "help-block" }, /* @__PURE__ */ h("h4", null, "Mouse Devices"), /* @__PURE__ */ h("p", null, /* @__PURE__ */ h("strong", null, "Left-click"), " on a candidate to validate/open it as the only option for that cell, discarding other candidates."), /* @__PURE__ */ h("p", null, /* @__PURE__ */ h("strong", null, "Right-click"), " on a candidate to exclude/blacklist it from the cell.")), /* @__PURE__ */ h("div", { className: "help-block" }, /* @__PURE__ */ h("h4", null, "Touchscreen Devices"), /* @__PURE__ */ h("p", null, /* @__PURE__ */ h("strong", null, "Tap"), " on a candidate card to open a menu where you can select which card to act on, then choose to open/validate or exclude it:"), /* @__PURE__ */ h("div", { className: "help-center-element", style: "margin-top: 15px;" }, inlineActionView)))), /* @__PURE__ */ h("section", { className: "help-section" }, /* @__PURE__ */ h("h3", null, "Hints"), /* @__PURE__ */ h("p", null, "Use hints to solve the puzzle. Hints are visual constraints showing relations between cards. You can click or tap on any hint to grey it out once you have fully resolved it."), /* @__PURE__ */ h("div", { className: "help-hint-item help-block" }, /* @__PURE__ */ h("div", { className: "description" }, /* @__PURE__ */ h("h4", null, "Vertical Hints"), /* @__PURE__ */ h("p", null, "Indicates that both cards are located in the ", /* @__PURE__ */ h("strong", null, "same column"), ":")), vHintWrapper), /* @__PURE__ */ h("div", { className: "help-hint-item help-block" }, /* @__PURE__ */ h("div", { className: "help-hint-description" }, /* @__PURE__ */ h("h4", null, "Horizontal: Neighbour Hint"), /* @__PURE__ */ h("p", null, "Indicates that the two cards are located in adjacent/neighbouring columns (the order is unknown):")), nearHintWrapper), /* @__PURE__ */ h("div", { className: "help-hint-item help-block" }, /* @__PURE__ */ h("div", { className: "description" }, /* @__PURE__ */ h("h4", null, "Horizontal: Directional Hint"), /* @__PURE__ */ h("p", null, "Indicates that the left card is positioned somewhere to the left of the right card (at any distance):")), dirHintWrapper), /* @__PURE__ */ h("div", { className: "help-hint-item help-block" }, /* @__PURE__ */ h("div", { className: "description" }, /* @__PURE__ */ h("h4", null, "Horizontal: Between Hint"), /* @__PURE__ */ h("p", null, "Indicates that the center card is positioned between the other two, in adjacent columns (the outer cards can be in either order):")), betHintWrapper))));
  container.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  return {
    element: container,
    name: "help",
    canDismissByOverlayClick: true
  };
}

// src/app.ts
var configurations = {
  "4x4": {
    numTypes: 4,
    numValues: 4,
    limits: { horizontal: 12, vertical: 8 },
    layout: {
      horizontalHints: { columns: 2, rows: 6 },
      verticalHints: { columns: 12 }
    }
  },
  "5x5": {
    numTypes: 5,
    numValues: 5,
    limits: { horizontal: 20, vertical: 10 },
    layout: {
      horizontalHints: { columns: 3, rows: 8 },
      verticalHints: { columns: 15 }
    }
  },
  "6x6": {
    numTypes: 6,
    numValues: 6,
    limits: { horizontal: 24, vertical: 15 },
    layout: {
      horizontalHints: { columns: 3, rows: 8 },
      verticalHints: { columns: 15 }
    }
  }
};
var board;
var puzzle;
var hints;
var boardView;
var hintToElement;
var finished = false;
var hasUsedAssistance = false;
var fullscreenContainer = document.querySelector(".fullscreen-container");
var timerElement = document.getElementById("timer-container");
var boardContainer = document.getElementById("board-container");
var hintsVContainer = document.getElementById("hints-v-container");
var hintsHContainer = document.getElementById("hints-h-container");
var screenManager = new ScreenManager(document.getElementById("screen-overlay"));
var timer = new Timer(timerElement);
var hintViewVisibility = new VisibilityObservable();
screenManager.onToggle((active) => {
  if (active) {
    ActionMenu.closeActive();
    timer.pause();
  } else {
    timer.start();
  }
});
var pauseGame = () => {
  screenManager.push(createPauseScreen());
};
document.getElementById("btn-pause").addEventListener("click", pauseGame);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && !finished) {
    pauseGame();
  }
});
document.getElementById("btn-toggle-hints").addEventListener("click", () => {
  hintViewVisibility.toggle();
});
document.getElementById("btn-help").addEventListener("click", () => {
  screenManager.push(createHelpScreen(() => screenManager.pop()));
});
function startGame(configKey = "5x5", debugData) {
  finished = false;
  hasUsedAssistance = false;
  hintViewVisibility.setVisible(true);
  timer.reset();
  timerElement.classList.remove("assisted");
  const config = configurations[configKey];
  boardContainer.replaceChildren();
  hintsVContainer.replaceChildren();
  hintsHContainer.replaceChildren();
  const generated = generate(config, debugData);
  board = generated.board;
  puzzle = generated.puzzle;
  hints = generated.hints;
  boardView = new BoardView(board);
  fullscreenContainer.setAttribute("data-puzzle-config", `${board.numTypes}x${board.numValues}`);
  boardContainer.appendChild(boardView.element);
  hintToElement = makeHintViews(hints, hintViewVisibility, hintsVContainer, hintsHContainer, config);
  board.addEventListener("change", () => {
    if (finished) return;
    if (!board.isValid(puzzle)) {
      finished = true;
      timer.stop();
      screenManager.push(createLoseScreen({
        onRestart: () => {
          screenManager.push(landingScreen);
        }
      }));
    } else if (board.isSolved()) {
      finished = true;
      timer.stop();
      const timeMs = timer.getElapsedTime();
      const bestTimeMs = timer.getBestTime(hasUsedAssistance, configKey);
      const isBest = timer.saveBestTime(hasUsedAssistance, configKey);
      screenManager.push(createWinScreen({
        timeMs,
        isBest,
        bestTimeMs,
        hasUsedAssistance,
        onRestart: () => {
          screenManager.push(landingScreen);
        }
      }));
    }
    logGameState();
  });
  for (const hint of hints) {
    hint.visibility.addEventListener("visibilityChanged", () => {
      logGameState();
    });
  }
  timer.start();
  logGameState();
}
var landingScreen = createLandingScreen(
  (selected) => {
    screenManager.pop();
    startGame(selected);
  },
  () => {
    screenManager.push(createHelpScreen(() => screenManager.pop()));
  }
);
screenManager.push(landingScreen);
document.getElementById("btn-exit").addEventListener("click", () => {
  finished = true;
  timer.stop();
  screenManager.push(landingScreen);
});
document.getElementById("btn-reveal-hint").addEventListener("click", () => {
  hasUsedAssistance = true;
  timerElement.classList.add("assisted");
  const hint = findFirstApplicableHint(board.toJSON(), hints);
  if (hint) {
    blinkHint(hint, hintToElement);
  } else {
    alert("No direct deductions found from any hint. You might need to combine information or you have made a mistake.");
  }
});
document.getElementById("btn-reveal-card").addEventListener("click", () => {
  hasUsedAssistance = true;
  timerElement.classList.add("assisted");
  const oldState = board.toJSON();
  const hint = findFirstApplicableHint(oldState, hints);
  if (hint) {
    blinkHint(hint, hintToElement);
    const tempBoard = Board.fromJSON(oldState, board.numTypes, board.numValues);
    hint.rule.apply(tempBoard);
    const newState = tempBoard.toJSON();
    const diff = findFirstDiff(oldState, newState, hint.rule);
    if (diff) {
      blinkSquareCandidate(boardView, diff);
    }
  } else {
    alert("No direct deductions found from any hint.");
  }
});
var logTimeout;
function logGameState() {
  if (finished) return;
  if (logTimeout !== void 0) return;
  logTimeout = window.setTimeout(() => {
    logTimeout = void 0;
    if (finished) return;
    const data = {
      puzzle: toJSON(puzzle),
      hints: hints.map(({ rule, visibility }) => {
        return {
          rule: rule.toJSON(),
          visible: visibility.isVisible
        };
      }),
      board: board.toJSON()
    };
    console.log(data);
  }, 0);
}
function generate(config, debugData) {
  if (debugData !== void 0) {
    const puzzle2 = fromJSON(debugData.puzzle);
    const board2 = Board.fromJSON(debugData.board, puzzle2.numTypes, puzzle2.numValues);
    const hints2 = debugData.hints.map((h2) => {
      const rule = ruleFromJSON(h2.rule);
      return makeHint(rule, h2.visible);
    });
    return { board: board2, puzzle: puzzle2, hints: hints2 };
  } else {
    const board2 = Board.create(config.numTypes, config.numValues);
    const generated = generatePuzzleWithAcceptableAmountOfHints(config);
    const puzzle2 = generated.puzzle;
    const hints2 = generated.rules.map((rule) => makeHint(rule));
    board2.applyRules(generated.rules.filter((r) => r instanceof OpenRule));
    return { board: board2, puzzle: puzzle2, hints: hints2 };
  }
}
function makeHintViews(hints2, hintViewVisibility2, hintsVContainer2, hintsHContainer2, config) {
  const hintToElement2 = /* @__PURE__ */ new Map();
  let hCount = 0;
  let vCount = 0;
  for (const hint of hints2) {
    if (hint.rule instanceof OpenRule) continue;
    if (hint.rule instanceof UnderRule) {
      const el = createVerticalHintElement(hint, hintViewVisibility2);
      hintsVContainer2.appendChild(el);
      hintToElement2.set(hint, el);
      vCount++;
    } else if (hint.rule instanceof NearRule || hint.rule instanceof DirectionRule || hint.rule instanceof BetweenRule) {
      const el = createHorizontalHintElement(hint, hintViewVisibility2);
      hintsHContainer2.appendChild(el);
      hintToElement2.set(hint, el);
      hCount++;
    }
  }
  for (let i = hCount; i < config.layout.horizontalHints.rows * config.layout.horizontalHints.columns; i++) {
    const el = document.createElement("div");
    el.classList.add("hint", "horizontal-hint");
    hintsHContainer2.appendChild(el);
  }
  for (let i = vCount; i < config.layout.verticalHints.columns; i++) {
    const el = document.createElement("div");
    el.classList.add("hint", "vertical-hint");
    hintsVContainer2.appendChild(el);
  }
  return hintToElement2;
}
//# sourceMappingURL=app.js.map
