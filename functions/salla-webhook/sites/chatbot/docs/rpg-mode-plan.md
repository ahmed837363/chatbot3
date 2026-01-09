# RPG Story Mode Plan

## Goals
- Provide a dedicated "RPG Session" view where the user plays as a single protagonist while tracking level, HP/energy, inventory notes, and custom resources.
- Keep standard chat flow but add an always-visible player sheet and narrator controls so the user can both roleplay and jump in as narrator when desired.
- Allow quick editing of the player sheet (add/remove stats, toggle narrator override) without leaving the chat.

## Key UX Pieces
1. **Player Sheet Drawer**: a right-side panel (collapsible) showing:
   - Character portrait + name + class/title.
   - Level, XP, HP, custom resource list (name/value pairs the user can edit inline).
   - Inventory / quest log freeform text area.
   - Buttons: "Edit Sheet" (opens modal), "Narrate" (switches textarea to narrator), "Resume Character".
2. **Resource Editing Modal**:
   - Fields: Level, XP, HP, custom resource rows (name/value, add/remove), inventory notes.
   - Save persists to localStorage along with chat session.
3. **Narrator Quick Toggle**:
   - In chat composer, add a small switch saying "Narrator mode" or a button when in RPG session so the user can inject narration without changing select box.

## Data Model Changes
- Extend `ChatSession` with optional `rpgState`:
  ```ts
  type RpgState = {
    playerName: string;
    title?: string;
    level: number;
    xp: number;
    hp: number;
    resources: Array<{ id: string; label: string; value: string }>;
    inventoryNotes: string;
    isNarratorMode: boolean;
  };
  ```
- Store/edit this per session so each campaign keeps its sheet.

## Implementation Steps
1. **State & Types**: add `RpgState` type, extend `ChatSession`, create helper hooks to read/update `activeSession.rpgState`.
2. **UI Components**:
   - New `RpgPanel` component (in `components/`) showing the sheet and edit button.
   - New `RpgSheetModal` for editing resources.
3. **Chat Integration**:
   - When `rpgState` exists, default "speaking as" to the player character, hide other options unless user toggles narrator.
   - Provide a "Narrator blast" button to set `speakingAs='narrator'` temporarily.
4. **Character Delete**:
   - Inside `CharacterModal`, add danger-zone button "Delete character" that calls new `onDelete` prop.

## Open Questions
- Should default sessions auto-create an RPG sheet? (Plan: add "Enable RPG Sheet" toggle in sidebar; when enabled, create default sheet with placeholder values.)
- Need to confirm if resources should sync with actual characters list or stay separate (assume separate for player-only stats).
