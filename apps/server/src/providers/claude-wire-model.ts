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

/**
 * What the SDK may be given, and the only two things it can be.
 *
 * The result is a discriminated union rather than a string, and that is the whole
 * point: neither arm is assignable to `string`, so a caller cannot store the
 * result on a feature, emit it to the frontend, or hand it back to the model
 * resolver without deliberately unwrapping it. The compiler refuses those uses
 * instead of trusting the caller to know which way the translation went.
 *
 * The `tier` arm carries the tier type, not a bare string: `opus` means "whatever
 * Opus is today", so a value that has become a tier alias must not be mistaken for
 * a canonical ID or a pinned version. Typing it as `ClaudeTier` makes putting it
 * back where a `ClaudeCanonicalId` belongs a compile error, which is the line the
 * ADR describes in prose.
 *
 * The `passed-through` arm is honest about the rest: a hand-written pin or a
 * Claude-compatible provider's own model passes through unchanged, so the
 * boundary cannot promise that its output is always a tier. It says instead that
 * the output is either a tier alias or a value Automaker never interpreted -- and
 * there is no third possibility for a reader to wonder about.
 */
export type ClaudeWireModel =
  | { readonly kind: 'tier'; readonly alias: ClaudeTier }
  | { readonly kind: 'passed-through'; readonly model: string };

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
 * A bare tier alias is not a special *input*: it is not a canonical ID, so it
 * takes the pass-through arm like any other string Automaker did not choose. No
 * three-way result is needed to say that.
 *
 * @example
 * ```typescript
 * const wire = toClaudeWireModel('claude-opus');   // { kind: 'tier', alias: 'opus' }
 * toClaudeWireModel('claude-opus-4-6-xyz');        // { kind: 'passed-through', model: '...' }
 * toClaudeWireModel('GLM-4.7');                    // { kind: 'passed-through', model: 'GLM-4.7' }
 * unwrapClaudeWireModel(wire);                     // 'opus' -- the one deliberate unwrap
 * ```
 */
export function toClaudeWireModel(model: string): ClaudeWireModel {
  if (isClaudeCanonicalId(model)) {
    return { kind: 'tier', alias: claudeTierOf(model) };
  }
  return { kind: 'passed-through', model };
}

/**
 * Recover the plain model string for the one caller that legitimately needs one:
 * the point where SDK options are assembled.
 *
 * This is not a second translation. It cannot turn a canonical ID into a tier
 * alias or the reverse; it only opens the result the boundary already produced, so
 * "a tier alias comes into existence at exactly one point on the way to the SDK"
 * is preserved.
 */
export function unwrapClaudeWireModel(wire: ClaudeWireModel): string {
  return wire.kind === 'tier' ? wire.alias : wire.model;
}
