import { describe, it, expect } from 'vitest';
import { BaseProvider } from '@/providers/base-provider.js';
import type {
  ProviderConfig,
  ExecuteOptions,
  ProviderMessage,
  InstallationStatus,
  ModelDefinition,
} from '@automaker/types';

const TEST_RESPONSE: ProviderMessage = {
  type: 'assistant',
  message: {
    role: 'assistant',
    content: [{ type: 'text', text: 'test response' }],
  },
};

// Concrete implementation for testing the abstract class
class TestProvider extends BaseProvider {
  getName(): string {
    return 'test-provider';
  }

  async *executeQuery(_options: ExecuteOptions): AsyncGenerator<ProviderMessage> {
    yield TEST_RESPONSE;
  }

  async detectInstallation(): Promise<InstallationStatus> {
    return { installed: true };
  }

  getAvailableModels(): ModelDefinition[] {
    return [
      {
        id: 'test-model-1',
        name: 'Test Model 1',
        modelString: 'test-model-1',
        provider: 'test-provider',
        description: 'A test model',
      },
    ];
  }
}

describe('base-provider.ts', () => {
  describe('constructor', () => {
    it('should initialize with empty config when none provided', () => {
      const provider = new TestProvider();
      expect(provider.getConfig()).toEqual({});
    });

    it('should initialize with provided config', () => {
      const config: ProviderConfig = {
        apiKey: 'test-key',
        env: { TEST: 'true' },
      };
      const provider = new TestProvider(config);
      expect(provider.getConfig()).toEqual(config);
    });

    it('should call getName() during initialization', () => {
      const provider = new TestProvider();
      expect(provider.getName()).toBe('test-provider');
    });
  });

  describe('validateConfig', () => {
    it('should return valid when config exists', () => {
      const provider = new TestProvider({ apiKey: 'test' });
      const result = provider.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return invalid when config is undefined', () => {
      // Create provider without config
      const provider = new TestProvider();
      // Manually set config to undefined to test edge case
      (provider as any).config = undefined;

      const result = provider.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Provider config is missing');
    });

    it('should return valid for empty config object', () => {
      const provider = new TestProvider({});
      const result = provider.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should include warnings array in result', () => {
      const provider = new TestProvider();
      const result = provider.validateConfig();

      expect(result).toHaveProperty('warnings');
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('supportsFeature', () => {
    it("should support 'tools' feature", () => {
      const provider = new TestProvider();
      expect(provider.supportsFeature('tools')).toBe(true);
    });

    it("should support 'text' feature", () => {
      const provider = new TestProvider();
      expect(provider.supportsFeature('text')).toBe(true);
    });

    it('should not support unknown features', () => {
      const provider = new TestProvider();
      expect(provider.supportsFeature('vision')).toBe(false);
      expect(provider.supportsFeature('mcp')).toBe(false);
      expect(provider.supportsFeature('unknown')).toBe(false);
    });

    it('should be case-sensitive', () => {
      const provider = new TestProvider();
      expect(provider.supportsFeature('TOOLS')).toBe(false);
      expect(provider.supportsFeature('Text')).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('should return current config', () => {
      const config: ProviderConfig = {
        apiKey: 'test-key',
        cliPath: '/usr/bin/test-cli',
      };
      const provider = new TestProvider(config);

      expect(provider.getConfig()).toEqual(config);
    });

    it('should return same reference', () => {
      const config: ProviderConfig = { apiKey: 'test' };
      const provider = new TestProvider(config);

      const retrieved1 = provider.getConfig();
      const retrieved2 = provider.getConfig();

      expect(retrieved1).toBe(retrieved2);
    });
  });

  describe('setConfig', () => {
    it('should merge partial config with existing config', () => {
      const provider = new TestProvider({ apiKey: 'original-key' });

      provider.setConfig({ env: { FEATURE: 'on' } });

      expect(provider.getConfig()).toEqual({
        apiKey: 'original-key',
        env: { FEATURE: 'on' },
      });
    });

    it('should override existing fields', () => {
      const provider = new TestProvider({ apiKey: 'old-key', cliPath: '/old-cli' });

      provider.setConfig({ apiKey: 'new-key' });

      expect(provider.getConfig()).toEqual({
        apiKey: 'new-key',
        cliPath: '/old-cli',
      });
    });

    it('should accept empty object', () => {
      const provider = new TestProvider({ apiKey: 'test' });
      const originalConfig = provider.getConfig();

      provider.setConfig({});

      expect(provider.getConfig()).toEqual(originalConfig);
    });

    it('should handle multiple updates', () => {
      const provider = new TestProvider();

      provider.setConfig({ apiKey: 'key1' });
      provider.setConfig({ cliPath: '/usr/bin/cli' });
      provider.setConfig({ env: { TEST: 'true' } });

      expect(provider.getConfig()).toEqual({
        apiKey: 'key1',
        cliPath: '/usr/bin/cli',
        env: { TEST: 'true' },
      });
    });

    it('should preserve other fields when updating one field', () => {
      const provider = new TestProvider({
        apiKey: 'key',
        cliPath: '/old-cli',
        env: { TEST: 'true' },
      });

      provider.setConfig({ cliPath: '/new-cli' });

      expect(provider.getConfig()).toEqual({
        apiKey: 'key',
        cliPath: '/new-cli',
        env: { TEST: 'true' },
      });
    });
  });

  describe('abstract methods', () => {
    it('should require getName implementation', () => {
      const provider = new TestProvider();
      expect(typeof provider.getName).toBe('function');
      expect(provider.getName()).toBe('test-provider');
    });

    it('should require executeQuery implementation', async () => {
      const provider = new TestProvider();
      expect(typeof provider.executeQuery).toBe('function');

      const generator = provider.executeQuery({
        prompt: 'test',
        model: 'test-model',
        cwd: '/test',
      });
      const result = await generator.next();

      expect(result.value).toEqual(TEST_RESPONSE);
    });

    it('should require detectInstallation implementation', async () => {
      const provider = new TestProvider();
      expect(typeof provider.detectInstallation).toBe('function');

      const status = await provider.detectInstallation();
      expect(status).toHaveProperty('installed');
    });

    it('should require getAvailableModels implementation', () => {
      const provider = new TestProvider();
      expect(typeof provider.getAvailableModels).toBe('function');

      const models = provider.getAvailableModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });
  });
});
