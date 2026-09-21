# Changelog

Notable behaviour changes. Release notes are generated from commits (see
`docs/release.md`); this file records the changes a user has to know about.

## Unreleased

### Changed

- **Claude models are addressed by tier, not by pinned version.** Choosing Claude Opus,
  Sonnet or Haiku now runs whatever model is current for that tier on your account,
  today and after every future release, with no Automaker update required. Automaker
  no longer converts a tier choice into a specific version before talking to the
  provider. See `docs/adr/0001-claude-tier-aliases.md`.

  As a consequence, Automaker cannot know which model actually ran, so the UI names the
  tier ("Claude Opus") and never a version.

  To pin a version deliberately, use the provider's own
  `ANTHROPIC_DEFAULT_OPUS_MODEL` / `ANTHROPIC_DEFAULT_SONNET_MODEL` /
  `ANTHROPIC_DEFAULT_HAIKU_MODEL` environment variables, or write the exact model ID on
  the feature yourself — a hand-written pin is still sent unchanged.

- **Existing feature cards follow their tier again.** Cards created before this change
  carry the specific Claude version that was current when you created them, because
  Automaker wrote it on your behalf. Those three versions — `claude-opus-4-6`,
  `claude-sonnet-4-6` and `claude-haiku-4-5-20251001` — are now recognised as tier
  choices when a card is read, so an existing backlog runs current models without you
  editing a single card. This applies to cards from every entry point (board, spec
  parser, backlog planner, GitHub issue and PR views) and to phase models.

  Nothing on disk is rewritten, so there is nothing to roll back. Any other version you
  wrote yourself is left exactly as it is — recognition is by exact match against those
  three IDs, never by pattern — so a deliberate pin still works. The one caveat: if you
  had deliberately pinned one of those three exact IDs, it now follows its tier instead;
  use the `ANTHROPIC_DEFAULT_*_MODEL` environment variables to pin it back.

  Because those three IDs no longer name the model that runs, the UI shows the tier for
  them rather than the version they spell.

- **Two dated Sonnet entries are gone from the Claude model picker.** `Claude Sonnet 4`
  (`claude-sonnet-4-20250514`) and `Claude 3.5 Sonnet` (`claude-3-5-sonnet-20241022`) were
  offered alongside the tiers and are no longer selectable. This is deliberate: keeping them
  would mean hand-maintaining pinned versions in the one place the change above exists to stop
  hand-maintaining them, and every release would have to decide again whether they are still
  worth listing.

  If a feature of yours already has one of them selected, it keeps running exactly as before —
  a version you hold is treated as a hand-written pin and is sent to the provider unchanged.
  You just cannot pick it again from the menu. To go on pinning a specific version, use the
  `ANTHROPIC_DEFAULT_SONNET_MODEL` environment variable, or write the model ID on the feature
  yourself.

- **Every panel now names a model the same way, and names it the way you picked it.** Three
  separate functions used to answer "what do I call this model", each with its own table, and
  they disagreed on most non-Claude models: the same Codex model read as `GPT-5.1 Max` on a
  kanban card and `GPT-5.1 Codex Max` in the running-agents list, while a Cursor, Copilot,
  Gemini or OpenCode model was often shown as a raw identifier in one panel and a lowercase
  fragment of one (`claude sonnet`, `2.5 flash`) in another. There is now one table, and it is
  assembled from each provider's own model catalogue — the same labels the model picker offers
  — so a model is displayed under the name you chose it by.

  Claude is unaffected: a Claude model is still named by its tier and never by a version.
  Labels that change on screen:
  - **Codex**: hyphenated, matching OpenAI's own model names. `GPT-5.1 Max` and
    `GPT-5.1 Codex Max` both become `GPT-5.1-Codex-Max`; likewise `-Codex-Mini`, `-Codex`,
    `GPT-5.2-Codex`, `GPT-5.3-Codex`, `GPT-5.3-Codex-Spark`, `GPT-5-Codex`, `GPT-5-Codex-Mini`
    and `GPT-5`. `GPT-5.1` and `GPT-5.2` are unchanged.
  - **Cursor**: the model's own name rather than `Cursor Sonnet` / `Cursor Opus` — for example
    `Claude Sonnet 4.6`, `Claude Opus 4.5 (Thinking)`, `Gemini 3 Pro`, `Grok`,
    `GPT-5.1 Codex Max`. `Cursor Auto` and `Composer 1` are unchanged. A Cursor model too new
    to be in the catalogue still falls back to `Cursor Sonnet` / `Cursor Opus`.
  - **Copilot**, **Gemini** and **OpenCode**: their catalogue labels, where previously either a
    raw identifier or a lowercase fragment — `Claude Sonnet 4.6`, `GPT-5.1 Codex Max`,
    `Gemini 2.5 Flash`, `Big Pickle`. Two OpenCode models regain the tier they are: `Kimi K2.5`
    and `MiniMax M2.5` are now `Kimi K2.5 Free` and `MiniMax M2.5 Free`.
  - **An unrecognised model** is shown as its identifier instead of a name invented from its
    dashes. `unknown-model-name` read as `model name` on a kanban card, and a single-word
    identifier rendered as a blank badge.
  - **Project settings** (the per-phase "Using: …" lines) named only Claude models and showed
    everything else as an identifier; they now use the same names as the rest of the app.

  A Claude-compatible provider's own name for a model still wins over all of this, unchanged.

- **Claude-compatible providers: your tier mappings now genuinely decide.** If you use a
  Claude-compatible provider (GLM, MiniMax, OpenRouter), Automaker already set
  `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU}_MODEL` from the tier mappings you configured,
  but those variables were inert while Automaker sent pinned model IDs. Now that a tier
  alias is sent, the variables take effect and your mappings decide which of the
  provider's models answers for each tier. This is the intended behaviour of the
  provider system, but it is a real change: if a different model starts answering than
  before, check your provider's tier mappings.
