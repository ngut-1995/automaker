# Context

Shared vocabulary for Automaker. Glossary only — no implementation details, no decisions.
Architectural decisions live in `docs/adr/`.

## Model identity

Three distinct things are often called "the model". They are not interchangeable.

### Tier alias

A name for a _capability class_, not a specific model: `opus`, `sonnet`, `haiku`. Resolves
late — the resolver is outside Automaker, and the same alias resolves to different concrete
models over time and across providers. Automaker cannot know from a tier alias which model
actually ran.

### Canonical ID

Automaker's internal spelling of a tier alias, carrying a provider prefix: `claude-opus`,
`cursor-auto`, `opencode-big-pickle`. This is the form stored in settings and on features,
and the form the UI reasons about. A canonical ID names a tier, never a version.

### Pinned model ID

An exact, versioned model: `claude-opus-4-6`, `claude-haiku-4-5-20251001`. Names one model
for all time. Reproducible, and stale the moment a successor ships.

A **pinned-by-accident** ID is a pinned model ID that was written by Automaker on the user's
behalf rather than chosen by the user. Automaker cannot distinguish it from a deliberate pin
by inspecting the value alone.

## Reasoning depth

Two separate concepts, both historically called "thinking".

### Thinking level

Automaker's user-facing choice of reasoning depth: `none`, `low`, `medium`, `high`,
`ultrathink`, `adaptive`. A preference expressed in Automaker's own vocabulary.

### Effort level

The model-side control for reasoning depth: `low`, `medium`, `high`, `xhigh`, `max`. Replaces
the older mechanism of granting a fixed reasoning-token budget. Which levels a model accepts
is a property of that model.

**Adaptive thinking** means the model decides its own reasoning depth per request, rather than
being given a budget. Whether a model supports it is a property of the model, not of the
string naming it.

## Model selection by purpose

### Feature model

The model that **implements** a feature — the one that writes code in the worktree. Stored on
the feature itself, so it is fixed when the card is created rather than read at execution time.

### Phase model

The model for one of Automaker's _auxiliary_ operations: enhancing a description, generating a
spec, planning the backlog, writing a commit message. Phase models never implement a feature;
there is deliberately no implementation phase.

## Providers

### Claude-compatible provider

A provider that speaks the Claude API but serves its own models (GLM, MiniMax, OpenRouter).
Its models are addressed by tier, so the provider decides what its own "Opus" is.
