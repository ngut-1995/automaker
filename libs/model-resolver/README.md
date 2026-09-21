# @automaker/model-resolver

Model normalisation utilities.

## Overview

This package normalises any model string to a **canonical ID** — Automaker's internal
spelling of a capability tier (`claude-opus`, `cursor-auto`, `opencode-big-pickle`).

Claude is addressed by tier, not by version. The resolver never expands a canonical ID
into a pinned model ID, and never returns a bare tier alias (`opus`): its output is
assigned back onto the running feature and emitted to the UI, where a bare alias would
reach code that infers capability from the model string. Translating a canonical ID
into the tier alias the SDK expects happens at the Claude provider boundary only.

See `CONTEXT.md` for the vocabulary and `docs/adr/0001-claude-tier-aliases.md` for the
decision and its consequences.

## Installation

```bash
npm install @automaker/model-resolver
```

## Exports

### Model Resolution

Normalise any model string to a canonical ID.

```typescript
import { resolveModelString, DEFAULT_MODELS } from '@automaker/model-resolver';

// Legacy bare aliases become canonical IDs
const model = resolveModelString('sonnet');
// Returns: 'claude-sonnet'

// Canonical IDs are returned unchanged -- never expanded to a version
const model2 = resolveModelString('claude-opus');
// Returns: 'claude-opus'

// Use with custom default
const model3 = resolveModelString(undefined, 'claude-sonnet');
// Returns: 'claude-sonnet' (default)

// A pinned model ID a user wrote by hand passes through untouched
const model4 = resolveModelString('claude-opus-4-1-20250805');
// Returns: 'claude-opus-4-1-20250805' (unchanged)
```

### Get Effective Model

Get the actual model that will be used, by priority:
explicit model > session model > default.

```typescript
import { getEffectiveModel } from '@automaker/model-resolver';

// getEffectiveModel(explicitModel?, sessionModel?, defaultModel?)
const model = getEffectiveModel('sonnet', undefined, 'claude-sonnet');
// Returns: 'claude-sonnet'
```

### Model Constants

Access model mappings and defaults.

```typescript
import { DEFAULT_MODELS } from '@automaker/model-resolver';
import { CLAUDE_MODEL_MAP } from '@automaker/types';

// Default model per provider (canonical IDs)
console.log(DEFAULT_MODELS.claude); // 'claude-opus'
console.log(DEFAULT_MODELS.cursor); // 'cursor-auto'

// Legacy bare alias -> canonical ID
console.log(CLAUDE_MODEL_MAP.haiku); // 'claude-haiku'
console.log(CLAUDE_MODEL_MAP.sonnet); // 'claude-sonnet'
console.log(CLAUDE_MODEL_MAP.opus); // 'claude-opus'
```

## Usage Example

```typescript
import { resolveModelString, DEFAULT_MODELS } from '@automaker/model-resolver';
import type { Feature } from '@automaker/types';

function prepareFeatureExecution(feature: Feature) {
  // Resolve model from feature or use default
  const model = resolveModelString(feature.model, DEFAULT_MODELS.autoMode);

  console.log(`Executing feature with model: ${model}`);

  return {
    featureId: feature.id,
    model,
    // ... other options
  };
}

// Example usage
const feature: Feature = {
  id: 'auth-feature',
  category: 'backend',
  description: 'Add authentication',
  model: 'opus', // User-friendly alias
};

prepareFeatureExecution(feature);
// Output: Executing feature with model: claude-opus
```

## Supported Models

### Claude canonical IDs

- `haiku` → `claude-haiku`
- `sonnet` → `claude-sonnet`
- `opus` → `claude-opus`

Each names a tier. Which concrete model a tier runs is decided by the provider, and can
be pinned deliberately through `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU}_MODEL`.

### Model Selection Guide

- **Haiku**: Fast responses, simple tasks, lower cost
- **Sonnet**: Balanced performance, most tasks (recommended default)
- **Opus**: Maximum capability, complex reasoning, highest cost

## Dependencies

- `@automaker/types` - Model type definitions and constants

## Used By

- `@automaker/server` - Feature execution, agent chat, enhancement

## Notes

- Model strings that don't match a known alias are passed through unchanged
- This allows direct use of a pinned version like `claude-opus-4-1-20250805`, and of a
  Claude-compatible provider's own models
- Always falls back to a sensible default if no model is specified
