---
status: accepted
---

# Claude models are addressed by tier alias, not pinned version

Automaker used to resolve its canonical Claude IDs (`claude-opus`, `claude-sonnet`,
`claude-haiku`) into pinned model IDs (`claude-opus-4-6`, …) before handing them to the Claude
Agent SDK. That pinning lived in four hand-maintained places and went stale on every model
release, while the OpenCode provider stayed current because it discovers its models at runtime.
We now send the tier alias (`opus`, `sonnet`, `haiku`) and let the SDK resolve it, so Automaker
tracks the current model per tier the way OpenCode already did.

## Consequences

**Automaker no longer knows which model ran.** This is the price of the decision, not an
oversight. Any capability or version inference from a model string is now unsound, so the UI
names the tier ("Claude Opus") and never a version. The effective model is observable from the
SDK's own init message; that is the only trustworthy source, and reading it is deliberately
left as later work.

**Tier aliases are captured by `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU}_MODEL`.** This is the
surprising part. Automaker already sets those variables from a Claude-compatible provider's
tier mappings, and they are exactly the mechanism that decides what an alias resolves to. While
Automaker sent pinned IDs the variables were inert; now a provider's mapping genuinely wins.
We treat this as correct — addressing a provider by tier and letting it choose its own "Opus"
is what the provider system is for — but it is a real behaviour change for GLM/MiniMax users,
and it is also the supported way to pin a version deliberately.

**Pinned IDs that Automaker wrote on the user's behalf are collapsed back to canonical on
read**, by an exact-match list of the three IDs it used to write. Matching `claude-{tier}-*` by
pattern would have been less maintenance but would also have silently unpinned versions a user
chose on purpose, and nothing in the stored value distinguishes the two cases.

**The picker offers three Claude entries where it offered five.** The two extra entries were
dated Sonnet versions, not tier duplicates, and they are not coming back: a catalogue entry is a
pinned version someone has to keep current, which is the maintenance this decision removes. The
cost falls only on re-selection — a version already stored on a feature is a hand-written pin
and still reaches the SDK unchanged — and `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU}_MODEL` remains
the supported way to pin. `apps/server/tests/unit/providers/claude-provider.test.ts` asserts the
catalogue is exactly the three tiers, so a fourth entry cannot reappear unnoticed.

## Rejected

**Bumping the pinned IDs to the current generation.** Correct today, stale at the next release,
and it leaves the four duplicated maps in place.

**Letting the resolver return the bare alias.** The resolved string is assigned back onto the
running feature and emitted to the UI, so a bare alias would reach code that infers capability
from the string. Normalising to canonical and translating to the wire format at the provider
boundary keeps the alias contained.
