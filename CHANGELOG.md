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

- **Claude-compatible providers: your tier mappings now genuinely decide.** If you use a
  Claude-compatible provider (GLM, MiniMax, OpenRouter), Automaker already set
  `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU}_MODEL` from the tier mappings you configured,
  but those variables were inert while Automaker sent pinned model IDs. Now that a tier
  alias is sent, the variables take effect and your mappings decide which of the
  provider's models answers for each tier. This is the intended behaviour of the
  provider system, but it is a real change: if a different model starts answering than
  before, check your provider's tier mappings.
