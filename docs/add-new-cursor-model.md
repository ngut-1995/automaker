# Adding New Cursor Models to Automaker

This guide explains how to add a new Cursor CLI model to Automaker. Cursor models are
enumerated in exactly one place — the Cursor catalogue — and every surface that lists
them derives from it, so adding a model is a one-entry change.

## Overview

The catalogue lives in `libs/types/src/cursor-models.ts`. That file holds:

- `CursorModelId` — union type of all valid canonical model IDs (always `cursor-` prefixed)
- `CursorModelRow` — the shape of one catalogue entry
- `CURSOR_MODEL_CATALOGUE` — `Record<CursorModelId, CursorModelRow>`, the table itself
- `CURSOR_CATALOGUE_ROWS` — the catalogue as a list, in catalogue order
- `CURSOR_MODEL_DEFINITIONS` — the server's model list, derived from the rows
- `DEFAULT_CURSOR_MODEL` — read off the row that declares `isDefault: true`
- `CURSOR_MODEL_GROUPS` / `STANDALONE_CURSOR_MODELS` — how the picker groups variants

Nothing else declares Cursor model rows. `libs/types/tests/unit/model-row-source.test.ts`
is a structural guard that scans `apps/` and `libs/` and fails on a model row declared
outside a catalogue module — the failure mode that caused ngut-1995/harbor#78, where a
hand-written UI list silently fell behind the shared table.

---

## Step-by-Step Guide

### Step 1: Add the Model ID to the Type

Open `libs/types/src/cursor-models.ts` and add your canonical ID to `CursorModelId`. The
`cursor-` prefix is required: it is what keeps `cursor-gpt-5.2-codex` distinct from
`codex-gpt-5.2-codex`.

```typescript
export type CursorModelId =
  | 'cursor-auto' // Auto-select best model
  | 'cursor-composer-1' // Cursor Composer agent model
  | 'cursor-sonnet-4.6' // Claude Sonnet 4.6
  // ... other models ...
  | 'cursor-grok' // Grok
  | 'cursor-your-new-model'; // <-- Add your model here
```

### Step 2: Add the Row to the Catalogue

In the same file, add an entry to `CURSOR_MODEL_CATALOGUE`, keyed by the canonical ID.
Place it where the picker should offer it: every derived list inherits catalogue order.

```typescript
export const CURSOR_MODEL_CATALOGUE: Record<CursorModelId, CursorModelRow> = {
  // ... existing rows ...

  'cursor-your-new-model': {
    id: 'cursor-your-new-model',
    label: 'Your New Model', // Display name in the picker and on the card
    description: 'One sentence explaining what the model is for',
    provider: 'cursor', // Always 'cursor'
    supportsVision: false, // Always false: the Cursor CLI drops images
    supportsTools: true, // Whether the model can call tools
    hasThinking: false, // true for a '-thinking' variant
    isDefault: false, // Exactly one row in the catalogue may be true
  },
};
```

### Step 3: Place the Model in the Picker

Every model must be reachable from the picker, either as a variant inside a group or as
a standalone entry.

If the model is a variant of one Automaker already offers (a compute level, a thinking
mode, a capacity tier), add it to the matching group's `variants` in
`CURSOR_MODEL_GROUPS`:

```typescript
{
  baseId: 'cursor-your-model-group',
  label: 'Your Model',
  description: 'What the family is for',
  variantType: 'compute', // 'compute' | 'thinking' | 'capacity'
  variants: [
    { id: 'cursor-your-new-model', label: 'Standard', description: 'Default compute level' },
    {
      id: 'cursor-your-new-model-high',
      label: 'High',
      description: 'High compute level',
      badge: 'More tokens',
    },
  ],
}
```

Otherwise add the ID to `STANDALONE_CURSOR_MODELS`.

### Step 4: Add a Legacy Alias (only if one exists)

`LegacyCursorModelId` and `LEGACY_CURSOR_MODEL_MAP` exist to migrate unprefixed IDs
Automaker itself once stored (`opus-4.5` → `cursor-opus-4.5`). A genuinely new model has
no history, so it needs no entry here. Add one only if the unprefixed form was already
written to a feature card.

### Step 5: Rebuild the Types Package

```bash
npm run build -w @automaker/types
```

### Step 6: Run the Catalogue Tests

```bash
npm run test:packages
```

`libs/types/tests/unit/provider-catalogues.test.ts` checks the invariants a new row can
break: the `cursor-` prefix, a non-empty label and description, the key matching the
row's own `id`, exactly one `isDefault`, the picker list and the server model list
matching the catalogue in catalogue order, and the picker name matching the name shown
on the card.

---

## Catalogue Row Fields

| Field            | Type                               | Description                                                              |
| ---------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| `id`             | `CursorModelId`                    | Canonical `cursor-` prefixed ID; must match the key. Stored on features  |
| `label`          | `string`                           | Display name — identical in picker, card badge and output header         |
| `description`    | `string`                           | One sentence explaining what the model is for                            |
| `provider`       | `Extract<ModelProvider, 'cursor'>` | Always `'cursor'`: the provider that serves the model                    |
| `supportsVision` | `boolean`                          | Always `false` — the Cursor CLI does not pass images                     |
| `supportsTools`  | `boolean`                          | Whether the model can call tools                                         |
| `hasThinking`    | `boolean`                          | Whether the model takes Automaker's thinking level                       |
| `isDefault`      | `boolean`                          | The model offered when Cursor is first chosen; exactly one row is `true` |

A Cursor row carries no cost class, no context window and no picker badge: Cursor
declares none for its models, and the catalogue does not invent a field the provider has
never stated.

Reasoning depth is spelled `hasThinking` because a Cursor model is chosen with a thinking
variant of its own (`cursor-opus-4.5-thinking`), not with an effort level. See
`CONTEXT.md`, "Reasoning depth".

---

## How It Works

### Automatic Propagation

One row added to `CURSOR_MODEL_CATALOGUE` reaches every surface, each deriving rather
than restating:

1. **`CURSOR_CATALOGUE_ROWS`** (`cursor-models.ts`) — `Object.values()` of the catalogue,
   in catalogue order. This is what a surface maps over.
2. **`CURSOR_MODELS`** (`libs/types/src/model-display.ts`) — the UI picker options, mapped
   from `CURSOR_CATALOGUE_ROWS`. `apps/ui/.../board-view/shared/model-constants.ts` merely
   re-exports it and folds it into `ALL_MODELS`; it builds nothing.
3. **`CURSOR_MODEL_DEFINITIONS`** (`cursor-models.ts`) — the server's model list, returned
   by `CursorProvider.getAvailableModels()`.
4. **`MODEL_DISPLAY_NAMES`** (`model-display.ts`) — assembled from every provider's
   catalogue rows, so the name on a card is by construction the name the model was picked
   by.
5. **`DEFAULT_CURSOR_MODEL`** (`cursor-models.ts`) — read off the row with
   `isDefault: true`, and used as `cursorDefaultModel` in `libs/types/src/settings.ts`.

The UI surfaces that consume these:

- `board-view/shared/model-selector.tsx` — the feature model picker, filtering `CURSOR_MODELS`
- `settings-view/model-defaults/phase-model-selector.tsx` — per-phase defaults, using
  `CURSOR_MODELS` plus `CURSOR_MODEL_GROUPS` / `STANDALONE_CURSOR_MODELS` for grouping
- `settings-view/providers/cursor-model-configuration.tsx` — Settings > Providers > Cursor,
  mapping `CURSOR_CATALOGUE_ROWS` directly

### Provider Routing

1. The canonical ID is stored on the feature as-is (e.g. `cursor-composer-1`) — the
   `cursor-` prefix is part of the ID, not something added at the edge.
2. `ProviderFactory.getProviderForModelName()` resolves the ID to the `cursor` provider.
3. `stripProviderPrefix()` from `@automaker/types` produces the bare ID
   (`cursor-composer-1` → `composer-1`) before it reaches `CursorProvider`, which asserts
   this with `validateBareModelId()`.
4. `CursorProvider` passes the bare ID to the Cursor CLI as `--model`, except for `auto`,
   where the flag is omitted entirely.

---

## Example: Adding a Hypothetical Model

Let's add a hypothetical "Cursor Turbo":

```typescript
// In libs/types/src/cursor-models.ts

// Step 1: Add to the ID union
export type CursorModelId =
  | 'cursor-auto'
  | 'cursor-composer-1'
  // ... other models ...
  | 'cursor-turbo'; // New model

// Step 2: Add to the catalogue
export const CURSOR_MODEL_CATALOGUE: Record<CursorModelId, CursorModelRow> = {
  // ... existing rows ...

  'cursor-turbo': {
    id: 'cursor-turbo',
    label: 'Cursor Turbo',
    description: 'Optimized for speed with good quality balance',
    provider: 'cursor',
    supportsVision: false,
    supportsTools: true,
    hasThinking: false,
    isDefault: false,
  },
};

// Step 3: It has no variants, so it is standalone
export const STANDALONE_CURSOR_MODELS: CursorModelId[] = [
  'cursor-auto',
  'cursor-composer-1',
  // ... other standalone models ...
  'cursor-turbo',
];
```

After rebuilding, "Cursor Turbo" appears in every model selection UI, in the server's
model list and in the display-name lookup — with no further edits.

---

## Checklist

- [ ] Added the canonical `cursor-` prefixed ID to `CursorModelId`
- [ ] Added the row to `CURSOR_MODEL_CATALOGUE`, in the position the picker should offer it
- [ ] Set all eight row fields, including `provider: 'cursor'`, `supportsTools` and `isDefault`
- [ ] Placed the ID in a `CURSOR_MODEL_GROUPS` group or in `STANDALONE_CURSOR_MODELS`
- [ ] Added a `LEGACY_CURSOR_MODEL_MAP` entry only if an unprefixed form was already stored
- [ ] Did not declare the row anywhere outside `cursor-models.ts`
- [ ] Rebuilt the types package (`npm run build -w @automaker/types`)
- [ ] Ran `npm run test:packages` (catalogue and row-source guards pass)
- [ ] Verified the model appears in the feature model picker
- [ ] Verified the model appears in Settings > Providers > Cursor
- [ ] Tested execution with the new model (if the Cursor CLI supports it)

---

## Notes

- The bare model ID (canonical ID minus the `cursor-` prefix) must exactly match what the
  Cursor CLI expects
- Check Cursor's documentation for available models: https://cursor.com/docs
- Models with `hasThinking: true` display a "Thinking" badge in the UI
- `supportsVision` is `false` throughout: the Cursor CLI does not pass images, whatever
  the underlying model can do
- `cursor-auto` is the one model whose card name differs from its catalogue label, because
  "Auto (Recommended)" is a recommendation rather than a name. The exception is recorded in
  `DISPLAY_NAME_OVERRIDES` in `model-display.ts`
