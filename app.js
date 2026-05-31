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

// src/engine/Card.ts
var ALL_TYPES = ["A", "B", "C", "D", "E", "F"];
var ALL_VALUES = [1, 2, 3, 4, 5, 6];
function sameCard(card1, card2) {
  return card1.type === card2.type && card1.value === card2.value;
}

// src/engine/Square.ts
var Square = class extends Observable {
  constructor(type, col, candidates = new Set(ALL_VALUES)) {
    super();
    this.type = type;
    this.col = col;
    this.candidates = candidates;
  }
  type;
  col;
  candidates;
  value = null;
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
  squares;
  isBatching = false;
  modifiedSquares = /* @__PURE__ */ new Set();
  static create() {
    return new _Board();
  }
  static fromJSON(json) {
    const board2 = new _Board();
    for (let i = 0; i < ALL_TYPES.length; i++) {
      for (let j = 0; j < 6; j++) {
        const square = board2.squares[ALL_TYPES[i]][j];
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
  constructor() {
    super();
    this.squares = {};
    for (const type of ALL_TYPES) {
      this.squares[type] = [];
      for (let col = 0; col < 6; col++) {
        this.squares[type].push(new Square(type, col));
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
    for (const type of ALL_TYPES) {
      for (const square of this.squares[type]) {
        if (!square.isResolved()) return false;
      }
    }
    return true;
  }
  isValid(puzzle2) {
    for (const type of ALL_TYPES) {
      for (let col = 0; col < 6; col++) {
        if (!this.squares[type][col].candidates.has(puzzle2[type][col])) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * Scans the row for columns that have only one candidate, or values that have only one column.
   */
  checkSingles(type) {
    const row = this.squares[type];
    const cellsCnt = [0, 0, 0, 0, 0, 0];
    const elsCnt = [0, 0, 0, 0, 0, 0];
    const lastValInCell = [0, 0, 0, 0, 0, 0];
    const lastCellForVal = [0, 0, 0, 0, 0, 0];
    for (let col = 0; col < 6; col++) {
      const square = row[col];
      for (const val of square.candidates) {
        const valIdx = val - 1;
        elsCnt[valIdx]++;
        lastCellForVal[valIdx] = col;
        cellsCnt[col]++;
        lastValInCell[col] = val;
      }
    }
    let changed = false;
    for (let col = 0; col < 6; col++) {
      if (cellsCnt[col] === 1) {
        const val = lastValInCell[col];
        if (elsCnt[val - 1] !== 1) {
          for (let i = 0; i < 6; i++) {
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
    for (let valIdx = 0; valIdx < 6; valIdx++) {
      if (elsCnt[valIdx] === 1) {
        const col = lastCellForVal[valIdx];
        const val = valIdx + 1;
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
    return ALL_TYPES.map((type) => this.squares[type].map((square) => Array.from(square.candidates)));
  }
};

// src/ui/VisibilityObservable.ts
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

// src/misc/symbols.ts
var SYMBOL_MAP = {
  A: { 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6" },
  B: { 1: "A", 2: "B", 3: "C", 4: "D", 5: "E", 6: "F" },
  C: { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI" },
  D: { 1: "\u2680", 2: "\u2681", 3: "\u2682", 4: "\u2683", 5: "\u2684", 6: "\u2685" },
  E: { 1: "\u2BC5", 2: "\u2BC6", 3: "\u25A0", 4: "\u25C6", 5: "\u2B1F", 6: "\u2BC2" },
  F: { 1: "+", 2: "-", 3: "\xF7", 4: "\xD7", 5: "=", 6: "\u221A" }
};

// src/ui/CardView.ts
var SHAPE_SVGS = {
  // Triangle Up
  1: '<svg viewBox="0 0 100 100"><polygon points="50,15 90,85 10,85" stroke-width="8" stroke="currentColor" fill="transparent"/></svg>',
  // Triangle Down
  2: '<svg viewBox="0 0 100 100"><polygon points="50,85 90,15 10,15" stroke-width="8" stroke="currentColor" fill="transparent"/></svg>',
  // Square
  3: '<svg viewBox="0 0 100 100"><rect x="20" y="20" width="60" height="60" stroke-width="8" stroke="currentColor" fill="transparent"/></svg>',
  // Diamond
  4: '<svg viewBox="0 0 100 100"><polygon points="50,15 85,50 50,85 15,50" stroke-width="8" stroke="currentColor" fill="transparent"/></svg>',
  // Pentagon Up
  5: '<svg viewBox="0 0 100 100"><polygon points="50,15 90,45 75,85 25,85 10,45" stroke-width="8" stroke="currentColor" fill="transparent"/></svg>',
  // Pentagon Down
  6: '<svg viewBox="0 0 100 100"><polygon points="50,85 90,55 75,15 25,15 10,55" stroke-width="8" stroke="currentColor" fill="transparent"/></svg>'
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
  el.className = `card type-${cardInfo.type} val-${cardInfo.value}`;
  if (cardInfo.type === "E") {
    el.innerHTML = SHAPE_SVGS[cardInfo.value];
    el.classList.add("shape-card");
  } else if (cardInfo.type === "D") {
    el.innerHTML = DICE_SVGS[cardInfo.value];
    el.classList.add("dice-card");
  } else {
    el.textContent = SYMBOL_MAP[cardInfo.type][cardInfo.value];
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
  constructor(square, selectedVal, onValidate, onExclude, onCancel = () => {
  }) {
    this.square = square;
    this.selectedVal = selectedVal;
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
    const content = document.createElement("div");
    content.className = "action-menu-content";
    const cardPreviewContainer = document.createElement("div");
    cardPreviewContainer.className = "action-menu-square-grid";
    for (const val of ALL_VALUES) {
      const container = document.createElement("div");
      container.className = "action-menu-mini-card-container";
      this.miniCardContainers[val - 1] = container;
      if (this.square.candidates.has(val)) {
        const cardEl = createCardElement({ type: this.square.type, value: val });
        cardEl.classList.add("large");
        container.appendChild(cardEl);
        if (val === this.selectedVal) {
          container.classList.add("selected");
        }
        container.addEventListener("click", () => {
          this.selectCard(val);
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
      this.onCancel();
      this.close();
    });
    buttonsContainer.appendChild(cancelBtn);
    const excludeBtn = document.createElement("button");
    excludeBtn.className = "action-menu-btn blacklist";
    excludeBtn.innerHTML = ICONS.EXCLUDE;
    excludeBtn.title = "Exclude";
    excludeBtn.addEventListener("click", () => {
      this.onExclude(this.selectedVal);
      this.close();
    });
    buttonsContainer.appendChild(excludeBtn);
    const validateBtn = document.createElement("button");
    validateBtn.className = "action-menu-btn validate";
    validateBtn.innerHTML = ICONS.VALIDATE;
    validateBtn.title = "Validate";
    validateBtn.addEventListener("click", () => {
      this.onValidate(this.selectedVal);
      this.close();
    });
    buttonsContainer.appendChild(validateBtn);
    content.appendChild(buttonsContainer);
    this.element.appendChild(content);
  }
  square;
  selectedVal;
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
  miniCardContainers = [];
  selectCard(val) {
    if (val === this.selectedVal) return;
    const prevContainer = this.miniCardContainers[this.selectedVal - 1];
    if (prevContainer) {
      prevContainer.classList.remove("selected");
    }
    this.selectedVal = val;
    const newContainer = this.miniCardContainers[this.selectedVal - 1];
    if (newContainer) {
      newContainer.classList.add("selected");
    }
  }
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

// src/ui/SquareView.ts
var SquareView = class {
  constructor(square, board2) {
    this.square = square;
    this.board = board2;
    this.element = document.createElement("div");
    this.element.className = `square-cell type-${square.type}`;
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
      this.candidatesContainer.style.display = "grid";
      this.resolvedContainer.style.display = "none";
      this.candidatesContainer.innerHTML = "";
      this.element.classList.remove("resolved");
      for (const val of ALL_VALUES) {
        const miniCardContainer = document.createElement("div");
        miniCardContainer.className = "mini-card-container";
        this.miniCardElements[val - 1] = miniCardContainer;
        if (this.square.candidates.has(val)) {
          const cardEl = createCardElement({ type: this.square.type, value: val });
          cardEl.classList.add("mini");
          miniCardContainer.appendChild(cardEl);
          miniCardContainer.addEventListener("click", (e) => {
            const isTouch = e.pointerType === "touch" || window.matchMedia("(pointer: coarse)").matches && e.pointerType !== "mouse";
            if (isTouch) {
              e.preventDefault();
              const menu = new ActionMenu(
                this.square,
                val,
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
    return this.miniCardElements[val - 1] || null;
  }
};

// src/ui/BoardView.ts
var BoardView = class {
  constructor(board2) {
    this.board = board2;
    this.element = document.createDocumentFragment();
    for (const type of ALL_TYPES) {
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
    const typeIndex = ALL_TYPES.indexOf(type);
    if (typeIndex === -1) return null;
    return this.squares[typeIndex * 6 + col] || null;
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

// src/engine/Rules.ts
function randomType() {
  return ALL_TYPES[randomInt(6)];
}
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
    const col1 = randomInt(6);
    const type1 = randomType();
    const val1 = puzzle2[type1][col1];
    let col2;
    if (col1 === 0) col2 = 1;
    else if (col1 === 5) col2 = 4;
    else col2 = randomInt(2) ? col1 + 1 : col1 - 1;
    const type2 = randomType();
    const val2 = puzzle2[type2][col2];
    return new _NearRule({ type: type1, value: val1 }, { type: type2, value: val2 });
  }
  applyToCol(board2, col, nearCard, thisCard) {
    const hasLeft = col === 0 ? false : board2.isPossible(col - 1, nearCard);
    const hasRight = col === 5 ? false : board2.isPossible(col + 1, nearCard);
    if (!hasRight && !hasLeft && board2.isPossible(col, thisCard)) {
      board2.excludeAt(col, thisCard);
      return true;
    }
    return false;
  }
  apply(board2) {
    let changed = false;
    for (let i = 0; i < 6; i++) {
      if (this.applyToCol(board2, i, this.card1, this.card2)) changed = true;
      if (this.applyToCol(board2, i, this.card2, this.card1)) changed = true;
    }
    if (changed) {
      this.apply(board2);
    }
    return changed;
  }
  getAsText() {
    return `${this.card1.type}${this.card1.value} is near to ${this.card2.type}${this.card2.value}`;
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
    const row1 = randomType();
    const row2 = randomType();
    const col1 = randomInt(5);
    const col2 = randomInt(5 - col1) + col1 + 1;
    const val1 = puzzle2[row1][col1];
    const val2 = puzzle2[row2][col2];
    return new _DirectionRule({ type: row1, value: val1 }, { type: row2, value: val2 });
  }
  apply(board2) {
    let changed = false;
    for (let i = 0; i < 6; i++) {
      if (board2.isPossible(i, this.card2)) {
        board2.excludeAt(i, this.card2);
        changed = true;
      }
      if (board2.isPossible(i, this.card1)) {
        break;
      }
    }
    for (let i = 5; i >= 0; i--) {
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
    return `${this.card1.type}${this.card1.value} is from the left of ${this.card2.type}${this.card2.value}`;
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
    const col = randomInt(6);
    const row = randomType();
    const val = puzzle2[row][col];
    return new _OpenRule({ type: row, value: val }, col);
  }
  apply(board2) {
    if (!board2.isDefined(this.col, this.card.type)) {
      board2.setAt(this.col, this.card);
      return true;
    }
    return false;
  }
  getAsText() {
    return `${this.card.type}${this.card.value} is at column ${this.col + 1}`;
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
    const col = randomInt(6);
    const row1 = randomType();
    const val1 = puzzle2[row1][col];
    let row2;
    do {
      row2 = randomType();
    } while (row2 === row1);
    const val2 = puzzle2[row2][col];
    return new _UnderRule({ type: row1, value: val1 }, { type: row2, value: val2 });
  }
  apply(board2) {
    let changed = false;
    for (let i = 0; i < 6; i++) {
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
    return `${this.card1.type}${this.card1.value} is the same column as ${this.card2.type}${this.card2.value}`;
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
    const centerType = randomType();
    const type1 = randomType();
    const type2 = randomType();
    const centerCol = randomInt(4) + 1;
    const centerCard = { type: centerType, value: puzzle2[centerType][centerCol] };
    let card1;
    let card2;
    if (randomInt(2)) {
      card1 = { type: type1, value: puzzle2[type1][centerCol - 1] };
      card2 = { type: type2, value: puzzle2[type2][centerCol + 1] };
    } else {
      card1 = { type: type1, value: puzzle2[type1][centerCol + 1] };
      card2 = { type: type2, value: puzzle2[type2][centerCol - 1] };
    }
    return new _BetweenRule(card1, card2, centerCard);
  }
  apply(board2) {
    let changed = false;
    if (board2.isPossible(0, this.centerCard)) {
      changed = true;
      board2.excludeAt(0, this.centerCard);
    }
    if (board2.isPossible(5, this.centerCard)) {
      changed = true;
      board2.excludeAt(5, this.centerCard);
    }
    let goodLoop;
    do {
      goodLoop = false;
      for (let i = 1; i < 5; i++) {
        if (board2.isPossible(i, this.centerCard)) {
          const conditionA = board2.isPossible(i - 1, this.card1) && board2.isPossible(i + 1, this.card2);
          const conditionB = board2.isPossible(i - 1, this.card2) && board2.isPossible(i + 1, this.card1);
          if (!(conditionA || conditionB)) {
            board2.excludeAt(i, this.centerCard);
            goodLoop = true;
          }
        }
      }
      for (let i = 0; i < 6; i++) {
        let leftPossible = false;
        let rightPossible = false;
        if (board2.isPossible(i, this.card2)) {
          if (i >= 2) leftPossible = board2.isPossible(i - 1, this.centerCard) && board2.isPossible(i - 2, this.card1);
          if (i < 4) rightPossible = board2.isPossible(i + 1, this.centerCard) && board2.isPossible(i + 2, this.card1);
          if (!leftPossible && !rightPossible) {
            board2.excludeAt(i, this.card2);
            goodLoop = true;
          }
        }
        if (board2.isPossible(i, this.card1)) {
          if (i >= 2) leftPossible = board2.isPossible(i - 1, this.centerCard) && board2.isPossible(i - 2, this.card2);
          if (i < 4) rightPossible = board2.isPossible(i + 1, this.centerCard) && board2.isPossible(i + 2, this.card2);
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
    return `${this.centerCard.type}${this.centerCard.value} is between ${this.card1.type}${this.card1.value} and ${this.card2.type}${this.card2.value}`;
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
  for (const type of ALL_TYPES) {
    console.log(`${type}: ${puzzle2[type].join(", ")}`);
  }
}
function generateRandomSolvedPuzzle() {
  const puzzle2 = {};
  for (const type of ALL_TYPES) {
    const row = [...ALL_VALUES];
    shuffleArray(row);
    puzzle2[type] = row;
  }
  return puzzle2;
}
function toJSON(puzzle2) {
  return ALL_TYPES.map((type) => puzzle2[type]);
}
function fromJSON(json) {
  const puzzle2 = {};
  for (let i = 0; i < ALL_TYPES.length; i++) {
    puzzle2[ALL_TYPES[i]] = json[i];
  }
  return puzzle2;
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
  const board2 = Board.create();
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
function removeRules(puzzle2, rules) {
  console.groupCollapsed("Removing rules");
  let possible;
  do {
    possible = false;
    for (let i = 0; i < rules.length; i++) {
      if (canSolve(puzzle2, rules.toSpliced(i, 1))) {
        possible = true;
        console.log(`Removing rule: ${rules[i].getAsText()}`);
        rules.splice(i, 1);
        break;
      }
    }
  } while (possible);
  console.groupEnd();
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
function generatePuzzle() {
  const puzzle2 = generateRandomSolvedPuzzle();
  printPuzzle(puzzle2);
  const rules = [];
  generateRules(puzzle2, rules);
  console.groupCollapsed(`${rules.length} rules generated`);
  printRules(rules);
  console.groupEnd();
  removeRules(puzzle2, rules);
  console.group("Final rules");
  printRules(rules);
  console.groupEnd();
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
function generatePuzzleWithAcceptableAmountOfHints() {
  console.group("Generating solvable puzzle");
  do {
    const { puzzle: puzzle2, rules } = generatePuzzle();
    const hints2 = countHints(rules);
    console.log(`Puzzle has ${hints2.horizontal} horizontal and ${hints2.vertical} vertical hints`);
    if (hints2.horizontal <= 24 && hints2.vertical <= 15) {
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
    const tempBoard = Board.fromJSON(board2);
    if (hint.rule.apply(tempBoard)) {
      return hint;
    }
  }
  return null;
}
function findFirstDiff(oldState, newState, rule) {
  const allDiffs = [];
  const resolvedDiffs = [];
  for (let t = 0; t < ALL_TYPES.length; t++) {
    const type = ALL_TYPES[t];
    for (let c = 0; c < 6; c++) {
      const oldCands = oldState[t][c];
      const newCands = newState[t][c];
      if (oldCands.length !== newCands.length) {
        if (newCands.length === 1 && oldCands.length > 1) {
          resolvedDiffs.push({ type, col: c, value: newCands[0] });
        }
        for (const v of oldCands) {
          if (!newCands.includes(v)) {
            allDiffs.push({ type, col: c, value: v });
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
function h(tag, props, ...children) {
  if (typeof tag === "function") {
    return tag({ ...props || {}, children });
  }
  const element = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === "className") {
        element.className = value;
      } else if (key.startsWith("data-")) {
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
  saveBestTime(withAssistance) {
    const key = localstorageKey(withAssistance);
    const currentBest = localStorage.getItem(key);
    if (!currentBest || this.elapsedTime < parseInt(currentBest, 10)) {
      localStorage.setItem(key, this.elapsedTime.toString());
      return true;
    }
    return false;
  }
  getBestTime(withAssistance) {
    const key = localstorageKey(withAssistance);
    const best = localStorage.getItem(key);
    return best ? parseInt(best, 10) : null;
  }
};
function localstorageKey(withAssistance) {
  return withAssistance ? "einstein-best-time-assisted" : "einstein-best-time";
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

// src/app.ts
var board;
var puzzle;
var hints;
var boardView;
var hintToElement;
var finished = false;
var hasUsedAssistance = false;
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
document.getElementById("btn-new-game").addEventListener("click", () => {
  startGame();
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
function startGame(debugData) {
  finished = false;
  hasUsedAssistance = false;
  timer.reset();
  timerElement.classList.remove("assisted");
  boardContainer.replaceChildren();
  hintsVContainer.replaceChildren();
  hintsHContainer.replaceChildren();
  const generated = generate(debugData);
  board = generated.board;
  puzzle = generated.puzzle;
  hints = generated.hints;
  boardView = new BoardView(board);
  boardContainer.appendChild(boardView.element);
  hintToElement = makeHintViews(hints, hintViewVisibility, hintsVContainer, hintsHContainer);
  board.addEventListener("change", () => {
    if (finished) return;
    if (!board.isValid(puzzle)) {
      finished = true;
      timer.stop();
      screenManager.push(createLoseScreen({
        onRestart: () => startGame()
      }));
    } else if (board.isSolved()) {
      finished = true;
      timer.stop();
      const timeMs = timer.getElapsedTime();
      const bestTimeMs = timer.getBestTime(hasUsedAssistance);
      const isBest = timer.saveBestTime(hasUsedAssistance);
      screenManager.push(createWinScreen({
        timeMs,
        isBest,
        bestTimeMs,
        hasUsedAssistance,
        onRestart: () => startGame()
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
startGame();
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
    const tempBoard = Board.fromJSON(oldState);
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
function generate(debugData) {
  if (debugData !== void 0) {
    const board2 = Board.fromJSON(debugData.board);
    const puzzle2 = fromJSON(debugData.puzzle);
    const hints2 = debugData.hints.map((h2) => {
      const rule = ruleFromJSON(h2.rule);
      return makeHint(rule, h2.visible);
    });
    return { board: board2, puzzle: puzzle2, hints: hints2 };
  } else {
    const board2 = Board.create();
    const generated = generatePuzzleWithAcceptableAmountOfHints();
    const puzzle2 = generated.puzzle;
    const hints2 = generated.rules.map((rule) => makeHint(rule));
    board2.applyRules(generated.rules.filter((r) => r instanceof OpenRule));
    return { board: board2, puzzle: puzzle2, hints: hints2 };
  }
}
function makeHintViews(hints2, hintViewVisibility2, hintsVContainer2, hintsHContainer2) {
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
  for (let i = hCount; i < 24; i++) {
    const el = document.createElement("div");
    el.classList.add("hint", "horizontal-hint");
    hintsHContainer2.appendChild(el);
  }
  for (let i = vCount; i < 15; i++) {
    const el = document.createElement("div");
    el.classList.add("hint", "vertical-hint");
    hintsVContainer2.appendChild(el);
  }
  return hintToElement2;
}
//# sourceMappingURL=app.js.map
