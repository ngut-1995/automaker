import { describe, it, expect, expectTypeOf } from 'vitest';
import { CLAUDE_TIERS, type ClaudeCanonicalId, type ClaudeTier } from '@automaker/types';
import {
  toClaudeWireModel,
  unwrapClaudeWireModel,
  type ClaudeWireModel,
} from '@/providers/claude-wire-model.js';
import { resolveModelString } from '@automaker/model-resolver';

describe('claude-wire-model', () => {
  describe('the wire value', () => {
    it.each(CLAUDE_TIERS)('turns claude-%s into the tier alias', (tier) => {
      const wire = toClaudeWireModel(`claude-${tier}` as ClaudeCanonicalId);

      expect(wire.kind).toBe('tier');
      expect(unwrapClaudeWireModel(wire)).toBe(tier);
    });

    it('passes a hand-written pinned model ID through unchanged', () => {
      const pin = 'claude-opus-1-19991231';
      const wire = toClaudeWireModel(pin);

      expect(wire.kind).toBe('passed-through');
      expect(unwrapClaudeWireModel(wire)).toBe(pin);
    });

    it("passes a Claude-compatible provider's model through unchanged", () => {
      const wire = toClaudeWireModel('GLM-4.7');

      expect(wire.kind).toBe('passed-through');
      expect(unwrapClaudeWireModel(wire)).toBe('GLM-4.7');
    });

    it('passes a bare tier alias through, since only a canonical ID is translated', () => {
      const wire = toClaudeWireModel('opus');

      expect(wire.kind).toBe('passed-through');
      expect(unwrapClaudeWireModel(wire)).toBe('opus');
    });
  });

  describe('the type boundary', () => {
    it('cannot be assigned to a model string without unwrapping', () => {
      // Criterion: "Its result is not assignable to a model string without being
      // unwrapped". A union of object types is not a string, so this must not compile.
      const wire = toClaudeWireModel('claude-opus');

      // @ts-expect-error a wire value is not a model string
      const asString: string = wire;
      void asString;

      expectTypeOf(wire).not.toBeString();
    });

    it('cannot be assigned where a canonical ID belongs', () => {
      // Criterion: "Assigning the result where a canonical ID belongs is a compile
      // error". Harmless at runtime; the point is the compiler refuses it.
      const wire = toClaudeWireModel('claude-opus');

      // @ts-expect-error a wire value is not a canonical ID
      const asCanonicalId: ClaudeCanonicalId = wire;
      void asCanonicalId;
    });

    it('cannot be fed back into the model resolver', () => {
      // Criterion: "Passing the result to the model resolver is a compile error".
      // The resolver's first parameter is constrained to `string`; a wire value is
      // not one. The thunk keeps the call from running -- passing the object would
      // throw at runtime and prove nothing.
      const wire = toClaudeWireModel('claude-opus');

      const feed = () => {
        // @ts-expect-error a wire value is not a resolver input
        return resolveModelString(wire);
      };
      void feed;
    });

    it('carries the tier type, not a bare string, in the tier arm', () => {
      // Criterion: "The tier arm carries the tier type rather than a bare string".
      type TierAlias = Extract<ClaudeWireModel, { kind: 'tier' }>['alias'];

      expectTypeOf<TierAlias>().toEqualTypeOf<ClaudeTier>();
      expectTypeOf<TierAlias>().not.toEqualTypeOf<string>();
    });

    it('keeps the wire union honest: a tier or a value Automaker never interpreted', () => {
      expectTypeOf<ClaudeWireModel>().toEqualTypeOf<
        | { readonly kind: 'tier'; readonly alias: ClaudeTier }
        | { readonly kind: 'passed-through'; readonly model: string }
      >();
    });

    it('holds for a model typed as an unconstrained string, as the provider receives it', () => {
      // THE DECISIVE CASE: `model` reaches the provider as an unconstrained
      // `string`, not a literal. If the return type still depended on the input
      // type, this would select a different arm and the guarantee would be a lie.
      const incoming: string = 'claude-opus';

      const wire = toClaudeWireModel(incoming);

      expectTypeOf(wire).toEqualTypeOf<ClaudeWireModel>();
      expect(wire.kind).toBe('tier');
      if (wire.kind === 'tier') {
        expect(wire.alias).toBe('opus');
      }
    });
  });
});
