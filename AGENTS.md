# AGENTS.md

## User interface

The user interface of the game is structured as a single-page web app using HTML, CSS, and TypeScript.
It uses an Observable pattern to react to game state changes, ensuring real-time updates.

- **Main Game Grid**: A 6x6 grid at the top-left. Each row corresponds to a card category (e.g., numbers, letters, shapes).
  - Each cell initially displays a 3x2 sub-grid of the 6 possible candidate cards.
  - **Left-click** validates the card, setting it as the only option for that cell and discarding other candidates.
  - **Right-click** blacklists the candidate, removing it from the candidate list.
- **Hints**:
  - **Vertical hints**: Displayed in a single fixed row of up to 15 hints below the main grid. Each hint consists of two vertically stacked cards.
  - **Horizontal hints**: Displayed to the right of the main grid using exactly **3 columns of 8 hints** (up to 24 hints total). Each hint features a near indicator (↔) or a direction indicator (…) to guide spatial relations.
  - Hints can be visually toggled (greyed out or restored) by clicking on them.
- **Control Panel**: Contains action buttons like Pause, Switch (inverts hint visibility), Exit, Save, Options, and Help.

- **Constraint Scanning**: The `Board` employs a scanning mechanism (`checkSingles`) that systematically enforces row-level constraints. Whenever a change occurs, it re-evaluates the entire row:
  - **Square-level**: If a square has only one candidate remaining, it is validated.
  - **Row-level**: If a specific card value remains a candidate in only one square across the entire row, that square is validated with that value.
  - This process repeats recursively until no more deductions can be made.
- **Batching System**: To prevent premature UI updates and ensure atomic state transitions, operations are batched. Events are only dispatched once the board reaches a steady state and no further automatic deductions are possible.

## Puzzle Generation & Rule Logic

The game uses a constraint-based puzzle generation process to provide randomized puzzles every time. This logic resides under `src/engine/PuzzleGenerator.ts` and `src/engine/Rules.ts`:

- **Puzzle Definition**: A `SolvedPuzzle` object represents the completed 6x6 board configuration. The generator starts by completely shuffling columns for each card type to yield a random solvable distribution.
- **Rule Constraints**: `Rule` subclasses (such as `UnderRule`, `NearRule`, `DirectionRule`, `BetweenRule`, and `OpenRule`) test the internal logic `Board`, attempting to exclude incorrect candidates (`blacklistAt`) or forcibly lock down correct ones (`validateAt`).
- **Generation Loop**: The generator tests rules continuously. It collects random rules and checks `canSolve()` using a hidden board simulating deductions step-by-step. It continues finding rules until `canSolve()` confirms that the current rule-set leads strictly to the `SolvedPuzzle` configuration without error.
- **Rule Pruning**: The generator runs a `removeRules` pass afterwards to strip off overly redundant rules without making the puzzle unsolvable, resulting in a minimally restrictive hint set.
- **Win / Loss Validation**: The actual game engine validates user-submitted states using `Board.isValid(SolvedPuzzle)`. The application subscribes to the board's changes and will dispatch a win/loss alert if a user resolves the full constraints, or mistakenly blacklists/validates an incompatible move preventing full resolution.

## Code Documentation Principles

The documentation must be maintained automatically by any agent altering the codebase.

- **Pragmatism**: Only document non-obvious code, complex algorithms (e.g. constraints propagation), architectural boundaries, and class responsibilities.
- **Avoid redundancy**: Do not document trivial methods, getters, setters, or self-explanatory variables.
- **Location**: Use JSDoc in source code for component and method-level details. Outline architectural structure in `AGENTS.md`. Update existing docs when modifying related code.

## Build System & Commands

The project uses `esbuild` for code bundling.

- **TS/CSS Build**: `node esbuild.ts`.
- **Typecheck**: `npx tsc --noEmit`.
- **Lint**: `npx eslint src/`.
- **Development**: `npm run dev` (starts a watch-mode dev server). Once running, the game can be accessed at: <http://localhost:8000/src/app.html>

## Project Structure

This directory structure highlights the core components of the application (only includes git-tracked files):

- `esbuild.ts`: Script for bundling TypeScript and CSS assets.
- `src/app.html`: Main application HTML entry point.
- `src/app.ts`: Main application Typescript entry point.
- `src/app.css`: Main application CSS entry point.

## Miscellaneous

Whenever you need to ask the user something, use any of these tools: "ask_user", "request_user_input", "askQuestions", "Ask User", "Request Input" or "Request Clarification" tools.
