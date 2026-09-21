import { describe, it, expect, expectTypeOf } from 'vitest';
import { CLAUDE_TIERS, type ClaudeCanonicalId, type ClaudeTier } from '@automaker/types';
import {
  toClaudeWireModel,
  type ClaudeWireModel,
  type PassedThroughClaudeModel,
  type RejectedBareTierAlias,
} from '@/providers/claude-wire-model.js';
import { resolveModelString } from '@automaker/model-resolver';

describe('claude-wire-model', () => {
  describe('the wire value', () => {
    it.each(CLAUDE_TIERS)('turns claude-%s into the tier alias', (tier) => {
      expect(toClaudeWireModel(`claude-${tier}` as ClaudeCanonicalId)).toBe(tier);
    });

    it('passes a hand-written pinned model ID through unchanged', () => {
      const pin = 'claude-opus-1-19991231';
      expect(toClaudeWireModel(pin)).toBe(pin);
    });

    it("passes a Claude-compatible provider's model through unchanged", () => {
      expect(toClaudeWireModel('GLM-4.7')).toBe('GLM-4.7');
    });
  });

  describe('the type boundary', () => {
    it('gives a canonical ID input the tier type, not the pass-through type', () => {
      // Criterion: "A canonical ID input returns the tier type, not the pass-through
      // type". If this regressed to ClaudeWireModel, assigning it where a tier is
      // expected below would stop compiling.
      expectTypeOf(
        toClaudeWireModel('claude-opus' as ClaudeCanonicalId)
      ).toEqualTypeOf<ClaudeTier>();
    });

    it('gives a pass-through input the opaque pass-through type', () => {
      expectTypeOf(toClaudeWireModel('GLM-4.7')).toEqualTypeOf<PassedThroughClaudeModel>();
    });

    it('refuses a bare tier alias as an input', () => {
      // Criterion: "A bare tier alias cannot be produced or consumed as a pass-through
      // model". The overload returns RejectedBareTierAlias; consuming it as a model is
      // a compile error.
      const rejected = toClaudeWireModel('opus');
      expectTypeOf(rejected).toEqualTypeOf<RejectedBareTierAlias>();

      // @ts-expect-error a rejected bare alias is not a pass-through model
      const consumed: PassedThroughClaudeModel = rejected;
      void consumed;
    });

    it('cannot be fed back into the model resolver', () => {
      // Criterion: "feeding the translation's output back into the model resolver is a
      // compile error". The resolver refuses a statically-known ClaudeTier.
      const wire = toClaudeWireModel('claude-opus' as ClaudeCanonicalId);
      expectTypeOf(wire).toEqualTypeOf<ClaudeTier>();

      // @ts-expect-error a tier alias is the boundary's output, not the resolver's input
      resolveModelString(wire);
    });

    it('keeps the wire union honest: a tier or a value Automaker never interpreted', () => {
      expectTypeOf<ClaudeWireModel>().toEqualTypeOf<ClaudeTier | PassedThroughClaudeModel>();
    });
  });
});
