/**
 * The Claude tiers, enumerated once.
 *
 * Automaker addresses Claude by tier, never by version (CONTEXT.md, and
 * docs/adr/0001-claude-tier-aliases.md). A tier therefore has four spellings,
 * and they are all the same fact wearing different clothes:
 *
 * | spelling         | example         | who reads it                          |
 * | ---------------- | --------------- | ------------------------------------- |
 * | tier alias       | `opus`          | the Claude SDK, as the wire value     |
 * | canonical ID     | `claude-opus`   | settings, feature cards, the resolver |
 * | display name     | `Claude Opus`   | every surface that names a model      |
 * | picker entry     | label + badge   | the model dropdowns                  |
 *
 * Each of those used to be written out per tier in its own table, which meant
 * adding or renaming a tier was a hunt for all of them. They are now derived
 * from `CLAUDE_TIER_ROWS` below: one row per tier, and the derivation is a
 * template string (`claude-${tier}`) rather than a map, so there is no inverse
 * table to keep in step either.
 *
 * **Adding a tier is adding a row here.** Nothing else.
 */

/**
 * Coarse capability rank a provider catalogue reports for a tier.
 *
 * Not a capability claim about a *model*: which model a tier runs is the
 * provider's decision, and the ADR is explicit that Automaker cannot know it.
 * This only orders the tiers relative to one another.
 */
export type ClaudeTierRank = 'basic' | 'standard' | 'premium';

/**
 * Everything Automaker knows about one Claude tier.
 *
 * Generic in the tier name so the derivation can be exercised with a tier that
 * does not exist yet — see `deriveClaudeTierTables`.
 */
export interface ClaudeTierRow<Tier extends string = string> {
  /**
   * The tier alias, which is also the SDK's wire value for the tier and the
   * stem of every other spelling.
   */
  readonly tier: Tier;
  /** What the UI calls this tier. Never contains a version. */
  readonly displayName: string;
  /** One sentence for the model picker. */
  readonly description: string;
  /** Short picker badge. */
  readonly badge: string;
  /** Rank reported by the provider catalogue. */
  readonly rank: ClaudeTierRank;
  /** Upper bound on output tokens advertised for this tier. */
  readonly maxOutputTokens: number;
  /** True for the one tier Automaker offers as its default. */
  readonly isDefault?: boolean;
}

/**
 * **The single source.** One row per Claude tier, ordered fastest first — the
 * order the model pickers show, and the order the canonical IDs are listed in.
 * The provider catalogue reverses it, because a catalogue leads with its most
 * capable entry.
 */
export const CLAUDE_TIER_ROWS = [
  {
    tier: 'haiku',
    displayName: 'Claude Haiku',
    description: 'Fast and efficient for simple tasks.',
    badge: 'Speed',
    rank: 'basic',
    maxOutputTokens: 8000,
    isDefault: false,
  },
  {
    tier: 'sonnet',
    displayName: 'Claude Sonnet',
    description: 'Balanced performance with strong reasoning.',
    badge: 'Balanced',
    rank: 'standard',
    maxOutputTokens: 64000,
    isDefault: false,
  },
  {
    tier: 'opus',
    displayName: 'Claude Opus',
    description: 'Most capable model for complex work.',
    badge: 'Premium',
    rank: 'premium',
    maxOutputTokens: 128000,
    isDefault: true,
  },
] as const satisfies readonly ClaudeTierRow[];

/**
 * A Claude tier alias: `haiku`, `sonnet`, `opus`.
 *
 * This is also the wire value the Claude SDK expects, which is why the wire
 * boundary returns this type rather than a bare string.
 */
export type ClaudeTier = (typeof CLAUDE_TIER_ROWS)[number]['tier'];

/**
 * Automaker's internal spelling of a tier: the canonical ID.
 *
 * Derived from the tier name, so the correspondence between the two cannot go
 * stale and needs no table.
 */
export type ClaudeCanonicalId = `claude-${ClaudeTier}`;

/** Context window advertised for every Claude tier. */
export const CLAUDE_TIER_CONTEXT_WINDOW = 200000;

/**
 * The tables every consumer reads, all of them a function of the rows.
 */
export interface ClaudeTierTables<Tier extends string> {
  /** Every tier alias, in row order. */
  readonly tiers: readonly Tier[];
  /** Every canonical ID, in row order. */
  readonly canonicalIds: readonly `claude-${Tier}`[];
  /** Tier alias -> canonical ID. */
  readonly canonicalIdByTier: Record<Tier, `claude-${Tier}`>;
  /** Tier alias -> display name. */
  readonly displayNames: Record<Tier, string>;
  /** Tier alias -> the row it all came from. */
  readonly rowByTier: Record<Tier, ClaudeTierRow<Tier>>;
}

/**
 * Derive every tier table from a list of rows.
 *
 * Exported, rather than inlined, for one reason: it lets a test put a tier that
 * does not exist through the same derivation the real tiers go through, and so
 * assert that adding a row is genuinely enough. Production code uses the
 * already-derived constants below.
 */
export function deriveClaudeTierTables<Tier extends string>(
  rows: readonly ClaudeTierRow<Tier>[]
): ClaudeTierTables<Tier> {
  const canonicalIdOf = (tier: Tier) => `claude-${tier}` as const;

  return {
    tiers: rows.map((row) => row.tier),
    canonicalIds: rows.map((row) => canonicalIdOf(row.tier)),
    canonicalIdByTier: Object.fromEntries(
      rows.map((row) => [row.tier, canonicalIdOf(row.tier)])
    ) as Record<Tier, `claude-${Tier}`>,
    displayNames: Object.fromEntries(rows.map((row) => [row.tier, row.displayName])) as Record<
      Tier,
      string
    >,
    rowByTier: Object.fromEntries(rows.map((row) => [row.tier, row])) as Record<
      Tier,
      ClaudeTierRow<Tier>
    >,
  };
}

const tables = deriveClaudeTierTables<ClaudeTier>(CLAUDE_TIER_ROWS);

/** Every Claude tier alias, fastest first. */
export const CLAUDE_TIERS: readonly ClaudeTier[] = tables.tiers;

/** Every canonical Claude ID, fastest first. */
export const CLAUDE_CANONICAL_IDS: readonly ClaudeCanonicalId[] = tables.canonicalIds;

/** Tier alias -> canonical ID, e.g. `opus` -> `claude-opus`. */
export const CLAUDE_CANONICAL_ID_BY_TIER: Record<ClaudeTier, ClaudeCanonicalId> =
  tables.canonicalIdByTier;

/**
 * Tier alias -> display name.
 *
 * A tier name is what the UI shows when it cannot honestly name a version.
 * See CONTEXT.md ("Tier alias") and docs/adr/0001-claude-tier-aliases.md.
 */
export const CLAUDE_TIER_DISPLAY_NAMES: Record<ClaudeTier, string> = tables.displayNames;

/** Tier alias -> its row. */
export const CLAUDE_TIER_ROW_BY_TIER: Record<
  ClaudeTier,
  ClaudeTierRow<ClaudeTier>
> = tables.rowByTier;

/** Check whether a string is a Claude tier alias. */
export function isClaudeTier(value: string): value is ClaudeTier {
  return (CLAUDE_TIERS as readonly string[]).includes(value);
}

/** Check whether a model string is one of Automaker's canonical Claude IDs. */
export function isClaudeCanonicalId(model: string): model is ClaudeCanonicalId {
  return (CLAUDE_CANONICAL_IDS as readonly string[]).includes(model);
}

/**
 * The tier a canonical ID names.
 *
 * The inverse of `claude-${tier}`, and the only thing the wire boundary needs
 * to do its job — which is why there is no canonical-ID-to-alias map anywhere.
 */
export function claudeTierOf(canonicalId: ClaudeCanonicalId): ClaudeTier {
  return canonicalId.slice('claude-'.length) as ClaudeTier;
}
