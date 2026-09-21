import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeProvider } from '@/providers/claude-provider.js';
import * as sdk from '@anthropic-ai/claude-agent-sdk';
import { collectAsyncGenerator } from '../../utils/helpers.js';

vi.mock('@anthropic-ai/claude-agent-sdk');

vi.mock('@automaker/platform', () => ({
  getClaudeAuthIndicators: vi.fn().mockResolvedValue({
    hasCredentialsFile: false,
    hasSettingsFile: false,
    hasStatsCacheWithActivity: false,
    hasProjectsSessions: false,
    credentials: null,
    checks: {},
  }),
}));

/**
 * The two dated Sonnet entries the tier move removed from the catalogue, kept out on
 * purpose. They were not tier duplicates, so their removal is a decision in its own
 * right: see CHANGELOG.md and docs/adr/0001-claude-tier-aliases.md.
 */
const DROPPED_DATED_SONNET_IDS = ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022'];

describe('claude-provider.ts', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ClaudeProvider();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_BASE_URL;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
  });

  describe('getName', () => {
    it("should return 'claude' as provider name", () => {
      expect(provider.getName()).toBe('claude');
    });
  });

  describe('executeQuery', () => {
    it('should execute simple text query', async () => {
      const mockMessages = [
        { type: 'text', text: 'Response 1' },
        { type: 'text', text: 'Response 2' },
      ];

      vi.mocked(sdk.query).mockReturnValue(
        (async function* () {
          for (const msg of mockMessages) {
            yield msg;
          }
        })()
      );

      const generator = provider.executeQuery({
        prompt: 'Hello',
        model: 'claude-opus',
        cwd: '/test',
      });

      const results = await collectAsyncGenerator(generator);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ type: 'text', text: 'Response 1' });
      expect(results[1]).toEqual({ type: 'text', text: 'Response 2' });
    });

    it('should pass correct options to SDK', async () => {
      vi.mocked(sdk.query).mockReturnValue(
        (async function* () {
          yield { type: 'text', text: 'test' };
        })()
      );

      const generator = provider.executeQuery({
        prompt: 'Test prompt',
        model: 'claude-opus',
        cwd: '/test/dir',
        systemPrompt: 'You are helpful',
        maxTurns: 10,
        allowedTools: ['Read', 'Write'],
      });

      await collectAsyncGenerator(generator);

      expect(sdk.query).toHaveBeenCalledWith({
        prompt: 'Test prompt',
        options: expect.objectContaining({
          // Canonical ID in, tier alias out: the SDK resolves the tier
          model: 'opus',
          systemPrompt: 'You are helpful',
          maxTurns: 10,
          cwd: '/test/dir',
          allowedTools: ['Read', 'Write'],
          permissionMode: 'bypassPermissions',
          allowDangerouslySkipPermissions: true,
        }),
      });
    });

    it('should not include allowedTools when not specified (caller decides via sdk-options)', async () => {
      vi.mocked(sdk.query).mockReturnValue(
        (async function* () {
          yield { type: 'text', text: 'test' };
        })()
      );

      const generator = provider.executeQuery({
        prompt: 'Test',
        model: 'claude-opus',
        cwd: '/test',
      });

      await collectAsyncGenerator(generator);

      expect(sdk.query).toHaveBeenCalledWith({
        prompt: 'Test',
        options: expect.not.objectContaining({
          allowedTools: expect.anything(),
        }),
      });
    });

    it('should pass abortController if provided', async () => {
      vi.mocked(sdk.query).mockReturnValue(
        (async function* () {
          yield { type: 'text', text: 'test' };
        })()
      );

      const abortController = new AbortController();

      const generator = provider.executeQuery({
        prompt: 'Test',
        model: 'claude-opus',
        cwd: '/test',
        abortController,
      });

      await collectAsyncGenerator(generator);

      expect(sdk.query).toHaveBeenCalledWith({
        prompt: 'Test',
        options: expect.objectContaining({
          abortController,
        }),
      });
    });

    it('should handle conversation history with sdkSessionId using resume option', async () => {
      vi.mocked(sdk.query).mockReturnValue(
        (async function* () {
          yield { type: 'text', text: 'test' };
        })()
      );

      const conversationHistory = [
        { role: 'user' as const, content: 'Previous message' },
        { role: 'assistant' as const, content: 'Previous response' },
      ];

      const generator = provider.executeQuery({
        prompt: 'Current message',
        model: 'claude-opus',
        cwd: '/test',
        conversationHistory,
        sdkSessionId: 'test-session-id',
      });

      await collectAsyncGenerator(generator);

      // Should use resume option when sdkSessionId is provided with history
      expect(sdk.query).toHaveBeenCalledWith({
        prompt: 'Current message',
        options: expect.objectContaining({
          resume: 'test-session-id',
        }),
      });
    });

    it('should handle array prompt (with images)', async () => {
      vi.mocked(sdk.query).mockReturnValue(
        (async function* () {
          yield { type: 'text', text: 'test' };
        })()
      );

      const arrayPrompt = [
        { type: 'text', text: 'Describe this' },
        { type: 'image', source: { type: 'base64', data: '...' } },
      ];

      const generator = provider.executeQuery({
        prompt: arrayPrompt as any,
        model: 'claude-opus',
        cwd: '/test',
      });

      await collectAsyncGenerator(generator);

      // Should pass an async generator as prompt for array inputs
      const callArgs = vi.mocked(sdk.query).mock.calls[0][0];
      expect(typeof callArgs.prompt).not.toBe('string');
    });

    it('should use maxTurns default of 1000', async () => {
      vi.mocked(sdk.query).mockReturnValue(
        (async function* () {
          yield { type: 'text', text: 'test' };
        })()
      );

      const generator = provider.executeQuery({
        prompt: 'Test',
        model: 'claude-opus',
        cwd: '/test',
      });

      await collectAsyncGenerator(generator);

      expect(sdk.query).toHaveBeenCalledWith({
        prompt: 'Test',
        options: expect.objectContaining({
          maxTurns: 1000,
        }),
      });
    });

    it('should handle errors during execution and rethrow', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const testError = new Error('SDK execution failed');

      vi.mocked(sdk.query).mockReturnValue(
        (async function* () {
          throw testError;
        })()
      );

      const generator = provider.executeQuery({
        prompt: 'Test',
        model: 'claude-opus',
        cwd: '/test',
      });

      await expect(collectAsyncGenerator(generator)).rejects.toThrow('SDK execution failed');

      // Should log error with classification info (via logger)
      // Logger format: 'ERROR [Context]' message, data
      const errorCall = consoleErrorSpy.mock.calls[0];
      expect(errorCall[0]).toMatch(/ERROR.*\[ClaudeProvider\]/);
      expect(errorCall[1]).toBe('executeQuery() error during execution:');
      expect(errorCall[2]).toMatchObject({
        type: expect.any(String),
        message: 'SDK execution failed',
        isRateLimit: false,
        stack: expect.stringContaining('Error: SDK execution failed'),
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('detectInstallation', () => {
    it('should return installed with SDK method', async () => {
      const result = await provider.detectInstallation();

      expect(result.installed).toBe(true);
      expect(result.method).toBe('sdk');
    });

    it('should detect ANTHROPIC_API_KEY', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';

      const result = await provider.detectInstallation();

      expect(result.hasApiKey).toBe(true);
      expect(result.authenticated).toBe(true);
    });

    it('should return hasApiKey false when no keys present', async () => {
      const result = await provider.detectInstallation();

      expect(result.hasApiKey).toBe(false);
      expect(result.authenticated).toBe(false);
    });
  });

  describe('environment variable passthrough', () => {
    afterEach(() => {
      delete process.env.ANTHROPIC_BASE_URL;
      delete process.env.ANTHROPIC_AUTH_TOKEN;
    });

    it('should pass ANTHROPIC_BASE_URL to SDK env', async () => {
      process.env.ANTHROPIC_BASE_URL = 'https://custom.example.com/v1';

      vi.mocked(sdk.query).mockReturnValue(
        (async function* () {
          yield { type: 'text', text: 'test' };
        })()
      );

      const generator = provider.executeQuery({
        prompt: 'Test',
        model: 'claude-opus',
        cwd: '/test',
      });

      await collectAsyncGenerator(generator);

      expect(sdk.query).toHaveBeenCalledWith({
        prompt: 'Test',
        options: expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_BASE_URL: 'https://custom.example.com/v1',
          }),
        }),
      });
    });

    it('should pass ANTHROPIC_AUTH_TOKEN to SDK env', async () => {
      process.env.ANTHROPIC_AUTH_TOKEN = 'custom-auth-token';

      vi.mocked(sdk.query).mockReturnValue(
        (async function* () {
          yield { type: 'text', text: 'test' };
        })()
      );

      const generator = provider.executeQuery({
        prompt: 'Test',
        model: 'claude-opus',
        cwd: '/test',
      });

      await collectAsyncGenerator(generator);

      expect(sdk.query).toHaveBeenCalledWith({
        prompt: 'Test',
        options: expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_AUTH_TOKEN: 'custom-auth-token',
          }),
        }),
      });
    });

    it('should pass both custom endpoint vars together', async () => {
      process.env.ANTHROPIC_BASE_URL = 'https://gateway.example.com';
      process.env.ANTHROPIC_AUTH_TOKEN = 'gateway-token';

      vi.mocked(sdk.query).mockReturnValue(
        (async function* () {
          yield { type: 'text', text: 'test' };
        })()
      );

      const generator = provider.executeQuery({
        prompt: 'Test',
        model: 'claude-opus',
        cwd: '/test',
      });

      await collectAsyncGenerator(generator);

      expect(sdk.query).toHaveBeenCalledWith({
        prompt: 'Test',
        options: expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_BASE_URL: 'https://gateway.example.com',
            ANTHROPIC_AUTH_TOKEN: 'gateway-token',
          }),
        }),
      });
    });
  });

  describe('the model reaching the SDK', () => {
    async function modelSentToSdk(model: string): Promise<unknown> {
      vi.mocked(sdk.query).mockReturnValue(
        (async function* () {
          yield { type: 'text', text: 'test' };
        })()
      );

      await collectAsyncGenerator(provider.executeQuery({ prompt: 'Test', model, cwd: '/test' }));

      return vi.mocked(sdk.query).mock.calls[0][0].options?.model;
    }

    it.each([
      ['claude-opus', 'opus'],
      ['claude-sonnet', 'sonnet'],
      ['claude-haiku', 'haiku'],
    ])('should send the tier alias for %s', async (canonicalId, tierAlias) => {
      expect(await modelSentToSdk(canonicalId)).toBe(tierAlias);
    });

    it('should send a hand-written pinned model ID unchanged', async () => {
      // A version the user pinned on purpose is theirs, not Automaker's to rewrite.
      const handWrittenPin = 'claude-opus-1-19991231';
      expect(await modelSentToSdk(handWrittenPin)).toBe(handWrittenPin);
    });

    it.each(['GLM-4.7', 'MiniMax-M2.1'])(
      "should send a Claude-compatible provider's model %s unchanged",
      async (providerModel) => {
        expect(await modelSentToSdk(providerModel)).toBe(providerModel);
      }
    );

    it.each(DROPPED_DATED_SONNET_IDS)(
      'should still send %s unchanged although it left the catalogue',
      async (droppedId) => {
        // These two are no longer selectable, but a feature that already carries one is
        // an ordinary hand-written pin: it is not in the pinned-by-accident map, so it
        // reaches the SDK as-is. This is what makes dropping them from the picker safe.
        expect(await modelSentToSdk(droppedId)).toBe(droppedId);
      }
    );
  });

  describe('getAvailableModels', () => {
    it('should return one entry per Claude tier', () => {
      const models = provider.getAvailableModels();

      expect(models.map((m) => m.id)).toEqual(['claude-opus', 'claude-sonnet', 'claude-haiku']);
    });

    it('should name tiers rather than versions', () => {
      const models = provider.getAvailableModels();

      expect(models.map((m) => m.name)).toEqual(['Claude Opus', 'Claude Sonnet', 'Claude Haiku']);
      expect(models.every((m) => m.provider === 'anthropic')).toBe(true);
    });

    it.each(DROPPED_DATED_SONNET_IDS)('should not offer %s again', (droppedId) => {
      // Deliberately removed, not forgotten: re-adding a dated identifier here means
      // hand-maintaining a pinned version in the one place the tier move exists to stop
      // doing that. See docs/adr/0001-claude-tier-aliases.md.
      const models = provider.getAvailableModels();

      expect(models.map((m) => m.id)).not.toContain(droppedId);
      expect(models.map((m) => m.modelString)).not.toContain(droppedId);
    });

    it('should not advertise a pinned model ID', () => {
      const models = provider.getAvailableModels();

      for (const model of models) {
        expect(model.id).toMatch(/^claude-(opus|sonnet|haiku)$/);
        expect(model.modelString).toBe(model.id);
      }
    });

    it('should mark Opus as default', () => {
      const models = provider.getAvailableModels();

      const opus = models.find((m) => m.id === 'claude-opus');
      expect(opus?.default).toBe(true);
    });

    it('should all support vision and tools', () => {
      const models = provider.getAvailableModels();

      models.forEach((model) => {
        expect(model.supportsVision).toBe(true);
        expect(model.supportsTools).toBe(true);
      });
    });

    it('should have correct context windows', () => {
      const models = provider.getAvailableModels();

      models.forEach((model) => {
        expect(model.contextWindow).toBe(200000);
      });
    });

    it('should have modelString field matching id', () => {
      const models = provider.getAvailableModels();

      models.forEach((model) => {
        expect(model.modelString).toBe(model.id);
      });
    });
  });

  describe('supportsFeature', () => {
    it("should support 'tools' feature", () => {
      expect(provider.supportsFeature('tools')).toBe(true);
    });

    it("should support 'text' feature", () => {
      expect(provider.supportsFeature('text')).toBe(true);
    });

    it("should support 'vision' feature", () => {
      expect(provider.supportsFeature('vision')).toBe(true);
    });

    it("should support 'thinking' feature", () => {
      expect(provider.supportsFeature('thinking')).toBe(true);
    });

    it("should not support 'mcp' feature", () => {
      expect(provider.supportsFeature('mcp')).toBe(false);
    });

    it("should not support 'cli' feature", () => {
      expect(provider.supportsFeature('cli')).toBe(false);
    });

    it('should not support unknown features', () => {
      expect(provider.supportsFeature('unknown')).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should validate config from base class', () => {
      const result = provider.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('config management', () => {
    it('should get and set config', () => {
      provider.setConfig({ apiKey: 'test-key' });

      const config = provider.getConfig();
      expect(config.apiKey).toBe('test-key');
    });

    it('should merge config updates', () => {
      provider.setConfig({ apiKey: 'key1' });
      provider.setConfig({ model: 'model1' });

      const config = provider.getConfig();
      expect(config.apiKey).toBe('key1');
      expect(config.model).toBe('model1');
    });
  });
});
