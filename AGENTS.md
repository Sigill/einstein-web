# AGENTS.md

## User interface

The user interface of the game is structured as a single-page web app using HTML, CSS, and TypeScript.
It uses an Observable pattern to react to game state changes, ensuring real-time updates.

- **Main Game Grid**: A 6x6 grid at the top-left. Each row corresponds to a card category (e.g., numbers, letters, shapes).
  - Each cell initially displays a 3x2 sub-grid of the 6 possible candidate cards.
  - **Left-click** validates the card, setting it as the only option for that cell and discarding other candidates.
  - **Right-click** blacklists the candidate, removing it from the candidate list.
- **Hints**:
  - **Vertical hints**: Displayed in a row below the main grid. Consists of two vertically stacked cards.
  - **Horizontal hints**: Displayed in columns on the top-right. Features a near indicator (↔) or an aside indicator (…) to guide spatial relations.
  - Hints can be visually toggled (greyed out or restored) by clicking on them.
- **Control Panel**: Contains action buttons like Pause, Switch (inverts hint visibility), Exit, Save, Options, and Help.

## Game Mechanics & Logic

The game implements an automatic constraint propagation system (a "cascade") to assist in solving the puzzle. This logic is centralized in the `Board` class and triggers whenever a state change occurs:

- **Validation Propagation**: When a card value is validated for a specific square (set as the only option), that same value is automatically blacklisted from all other squares in the same row.
- **Blacklist Propagation**: When a candidate is blacklisted from a square, two checks are performed:
  - **Square-level**: If a square has only one candidate remaining, it is automatically validated with that value.
  - **Row-level**: If a specific card value remains a candidate in only one square across the entire row, that square is automatically validated with that value.
- **Queue System**: To handle the resulting chain reactions, the `Board` uses a FIFO (First-In-First-Out) queue. This ensures that all indirect deductions are processed sequentially and the game state remains consistent before UI updates are triggered.

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
