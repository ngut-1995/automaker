import type { ModelOption } from '@automaker/types';

/**
 * The model part of an OpenCode identifier, whichever spelling it arrives in.
 *
 * Automaker's canonical IDs are dash-prefixed (`opencode-glm-5-free`) while the
 * OpenCode CLI reports the same models with a slash (`opencode/glm-5-free`).
 * Comparing that part alone is what lets the two spellings recognise each other.
 */
function bareOpencodeModelId(id: string): string {
  if (id.startsWith('opencode-')) return id.slice('opencode-'.length);
  if (id.startsWith('opencode/')) return id.slice('opencode/'.length);
  return id;
}

/**
 * One picker list from the OpenCode models Automaker declares and the ones the
 * CLI discovers at runtime.
 *
 * OpenCode is the one provider whose model list is not fully known at build
 * time. The catalogue in `@automaker/types` declares the free tier Automaker can
 * promise without asking; everything else arrives from the CLI. Both end up as
 * ordinary `ModelOption` rows here, in one list, wearing no mark of where they
 * came from: the picker renders a discovered model exactly as it renders a
 * declared one, and never needs to know which providers discover
 * (ngut-1995/harbor#83).
 *
 * A declared row wins a collision, because it is the one whose ID matches what
 * a feature card stores.
 */
export function mergeDiscoveredOpencodeModels(
  declared: ModelOption[],
  discovered: ModelOption[]
): ModelOption[] {
  const declaredIds = new Set(declared.map((model) => bareOpencodeModelId(model.id)));
  return [
    ...declared,
    ...discovered.filter((model) => !declaredIds.has(bareOpencodeModelId(model.id))),
  ];
}
