import type { GeminiModelId } from '@automaker/types';
import { GeminiIcon } from '@/components/ui/provider-icon';
import { GEMINI_CATALOGUE_ROWS } from '@automaker/types';
import { BaseModelConfiguration, type BaseModelInfo } from './shared/base-model-configuration';

interface GeminiModelConfigurationProps {
  enabledGeminiModels: GeminiModelId[];
  geminiDefaultModel: GeminiModelId;
  isSaving: boolean;
  onDefaultModelChange: (model: GeminiModelId) => void;
  onModelToggle: (model: GeminiModelId, enabled: boolean) => void;
}

interface GeminiModelInfo extends BaseModelInfo<GeminiModelId> {
  supportsThinking: boolean;
}

// Derived from the Gemini catalogue, the one place Gemini models are enumerated
const GEMINI_MODELS: GeminiModelInfo[] = GEMINI_CATALOGUE_ROWS.map((row) => ({
  id: row.id,
  label: row.label,
  description: row.description,
  supportsThinking: row.hasThinking,
}));

export function GeminiModelConfiguration({
  enabledGeminiModels,
  geminiDefaultModel,
  isSaving,
  onDefaultModelChange,
  onModelToggle,
}: GeminiModelConfigurationProps) {
  return (
    <BaseModelConfiguration<GeminiModelId>
      providerName="Gemini"
      icon={<GeminiIcon className="w-5 h-5 text-blue-500" />}
      iconGradient="from-blue-500/20 to-blue-600/10"
      iconBorder="border-blue-500/20"
      models={GEMINI_MODELS}
      enabledModels={enabledGeminiModels}
      defaultModel={geminiDefaultModel}
      isSaving={isSaving}
      onDefaultModelChange={onDefaultModelChange}
      onModelToggle={onModelToggle}
      getFeatureBadge={(model) => {
        const geminiModel = model as GeminiModelInfo;
        return geminiModel.supportsThinking ? { show: true, label: 'Thinking' } : null;
      }}
    />
  );
}
