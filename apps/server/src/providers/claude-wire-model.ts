/**
 * The Claude wire boundary: the one place a canonical ID becomes the value the
 * Claude Agent SDK is given.
 *
 * This is a module of its own, and not part of `claude-provider.ts`, because a
 * caller that makes a direct SDK call needs nothing but this translation --
 * `routes/setup/routes/verify-claude-auth.ts` used to import the whole provider
 * class to reach it. Nothing here imports the SDK or the provider.
 *
 * See docs/adr/0001-claude-tier-aliases.md.
 */

import { claudeTierOf, isClaudeCanonicalId, type ClaudeTier } from '@automaker/types';

declare const passedThroughModel: unique symbol;

/**
 * A model string Automaker did not choose and does not understand: a version the
 * user pinned by hand, or a Claude-compatible provider's own model. It reaches
 * the SDK exactly as written.
 *
 * The brand cannot be produced anywhere but here, so a value of this type is
 * evidence that it came through the boundary rather than being assembled
 * somewhere upstream.
 */
export type PassedThroughClaudeModel = string & { readonly [passedThroughModel]: true };

/**
 * What the SDK may be given, and the only two things it can be.
 *
 * The first case is the tier type, not a string: the whole point of the tier work
 * is that `opus` means "whatever Opus is today", so a value that has become a
 * tier alias must not be mistaken for a canonical ID or a version. Typing it as
 * `ClaudeTier` makes putting it back where a `ClaudeCanonicalId` belongs a
 * compile error, which is the line the ADR describes in prose.
 *
 * The second case is honest about the rest: a hand-written pin passes through
 * unchanged, so the boundary cannot promise that its output is always a tier. It
 * says instead that the output is either a tier alias or a value Automaker never
 * interpreted -- and there is no third possibility for a reader to wonder about.
 */
export type ClaudeWireModel = ClaudeTier | PassedThroughClaudeModel;

/**
 * Translate a model string into the value sent to the Claude Agent SDK.
 *
 * A canonical ID becomes its tier alias. Everything else -- a hand-written pinned
 * model ID, a Claude-compatible provider's own model -- is passed through
 * unchanged, because Automaker has no business rewriting a model it did not choose.
 *
 * **This is the single point where a tier alias comes into existence.** The SDK
 * resolves the alias to whatever model is current for that tier on this account,
 * and `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU}_MODEL` -- which Automaker sets from a
 * Claude-compatible provider's tier mappings -- is what captures it. Every other
 * consumer keeps seeing the canonical ID: neither `stripProviderPrefix` nor
 * `getBareModelIdForCli` does this, both passing the `claude-` prefix through
 * deliberately.
 *
 * @example
 * ```typescript
 * toClaudeWireModel('claude-opus');          // 'opus'          (tier alias)
 * toClaudeWireModel('claude-opus-4-6-xyz');  // unchanged       (hand-written pin)
 * toClaudeWireModel('GLM-4.7');              // unchanged       (provider's model)
 * ```
 */
export function toClaudeWireModel(model: string): ClaudeWireModel {
  if (isClaudeCanonicalId(model)) {
    return claudeTierOf(model);
  }
  return model as PassedThroughClaudeModel;
}
