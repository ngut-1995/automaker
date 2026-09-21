import type { CopilotModelId } from '@automaker/types';
import { CopilotIcon } from '@/components/ui/provider-icon';
import { COPILOT_CATALOGUE_ROWS } from '@automaker/types';
import { BaseModelConfiguration, type BaseModelInfo } from './shared/base-model-configuration';

interface CopilotModelConfigurationProps {
  enabledCopilotModels: CopilotModelId[];
  copilotDefaultModel: CopilotModelId;
  isSaving: boolean;
  onDefaultModelChange: (model: CopilotModelId) => void;
  onModelToggle: (model: CopilotModelId, enabled: boolean) => void;
}

interface CopilotModelInfo extends BaseModelInfo<CopilotModelId> {
  supportsVision: boolean;
}

// Derived from the Copilot catalogue, the one place Copilot models are enumerated
const COPILOT_MODELS: CopilotModelInfo[] = COPILOT_CATALOGUE_ROWS.map((row) => ({
  id: row.id,
  label: row.label,
  description: row.description,
  supportsVision: row.supportsVision,
}));

export function CopilotModelConfiguration({
  enabledCopilotModels,
  copilotDefaultModel,
  isSaving,
  onDefaultModelChange,
  onModelToggle,
}: CopilotModelConfigurationProps) {
  return (
    <BaseModelConfiguration<CopilotModelId>
      providerName="Copilot"
      icon={<CopilotIcon className="w-5 h-5 text-violet-500" />}
      iconGradient="from-violet-500/20 to-violet-600/10"
      iconBorder="border-violet-500/20"
      models={COPILOT_MODELS}
      enabledModels={enabledCopilotModels}
      defaultModel={copilotDefaultModel}
      isSaving={isSaving}
      onDefaultModelChange={onDefaultModelChange}
      onModelToggle={onModelToggle}
      getFeatureBadge={(model) => {
        const copilotModel = model as CopilotModelInfo;
        return copilotModel.supportsVision ? { show: true, label: 'Vision' } : null;
      }}
    />
  );
}
