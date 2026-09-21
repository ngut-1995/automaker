import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeProvider } from '@/providers/claude-provider.js';
import * as wire from '@/providers/claude-wire-model.js';
import * as sdk from '@anthropic-ai/claude-agent-sdk';
import { CLAUDE_TIERS, CLAUDE_TIER_DISPLAY_NAMES, CLAUDE_TIER_ROWS } from '@automaker/types';
import { collectAsyncGenerator } from '../../utils/helpers.js';

vi.mock('@anthropic-ai/claude-agent-sdk');

vi.mock('@/providers/claude-wire-model.js', async (importOriginal) => {
  const actual = await importOriginal<typeof wire>();
  return { ...actual, toClaudeWireModel: vi.fn(actual.toClaudeWireModel) };
});

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
 * A dated Sonnet entry the tier move removed from the catalogue, kept out on
 * purpose. It was not a tier duplicate, so its removal is a decision in its own
 * right: see CHANGELOG.md and docs/adr/0001-claude-tier-aliases.md.
 *
 * Note the other removed entry, `claude-sonnet-4-20250514`, is *not* here: the
 * history audit behind ngut-1995/harbor#40 found Automaker had written it on the
 * user's behalf, so the resolver collapses it to `claude-sonnet` before it can
 * reach the provider at all.
 */
const DROPPED_DATED_SONNET_IDS = ['claude-3-5-sonnet-20241022'];

const SESSION_UUID = '00000000-0000-4000-8000-000000000000';

function assistantMessage(text: string): sdk.SDKAssistantMessage {
  return {
    type: 'assistant',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text }],
    },
    parent_tool_use_id: null,
    uuid: SESSION_UUID,
    session_id: 'test-session',
  };
}

/**
 * Wrap a stream of SDK messages in the full `Query` shape `sdk.query` returns.
 * The control methods are unused by the provider, but `Query` requires them.
 */
function createQuery(stream: AsyncGenerator<sdk.SDKMessage, void>): sdk.Query {
  return Object.assign(stream, {
    interrupt: vi.fn(),
    setPermissionMode: vi.fn(),
    setModel: vi.fn(),
    setMaxThinkingTokens: vi.fn(),
    initializationResult: vi.fn(),
    supportedCommands: vi.fn(),
    supportedModels: vi.fn(),
    mcpServerStatus: vi.fn(),
    accountInfo: vi.fn(),
    rewindFiles: vi.fn(),
    reconnectMcpServer: vi.fn(),
    toggleMcpServer: vi.fn(),
    setMcpServers: vi.fn(),
    streamInput: vi.fn(),
    close: vi.fn(),
  });
}

function emptyQuery(): sdk.Query {
  return createQuery((async function* () {})());
}

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
      const mockMessages = [assistantMessage('Response 1'), assistantMessage('Response 2')];

      vi.mocked(sdk.query).mockReturnValue(
        createQuery(
          (async function* () {
            for (const msg of mockMessages) {
              yield msg;
            }
          })()
        )
      );

      const generator = provider.executeQuery({
        prompt: 'Hello',
        model: 'claude-opus',
        cwd: '/test',
      });

      const results = await collectAsyncGenerator(generator);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(mockMessages[0]);
      expect(results[1]).toEqual(mockMessages[1]);
    });

    it('should pass correct options to SDK', async () => {
      vi.mocked(sdk.query).mockReturnValue(emptyQuery());

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
      vi.mocked(sdk.query).mockReturnValue(emptyQuery());

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
      vi.mocked(sdk.query).mockReturnValue(emptyQuery());

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
      vi.mocked(sdk.query).mockReturnValue(emptyQuery());

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
      vi.mocked(sdk.query).mockReturnValue(emptyQuery());

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
      vi.mocked(sdk.query).mockReturnValue(emptyQuery());

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
        createQuery(
          (async function* () {
            throw testError;
          })()
        )
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

      vi.mocked(sdk.query).mockReturnValue(emptyQuery());

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

      vi.mocked(sdk.query).mockReturnValue(emptyQuery());

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

      vi.mocked(sdk.query).mockReturnValue(emptyQuery());

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
      vi.mocked(sdk.query).mockReturnValue(emptyQuery());

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

  describe('the wire boundary', () => {
    async function runQuery(model: string): Promise<void> {
      vi.mocked(sdk.query).mockReturnValue(emptyQuery());
      await collectAsyncGenerator(provider.executeQuery({ prompt: 'Test', model, cwd: '/test' }));
    }

    it.each(CLAUDE_TIERS)(
      'translates claude-%s exactly once on the way to the SDK',
      async (tier) => {
        // Criterion: "the translation still happens at exactly one point on the way to
        // the SDK". Moving the function out of this module must not add a second call.
        await runQuery(`claude-${tier}`);

        expect(vi.mocked(wire.toClaudeWireModel)).toHaveBeenCalledTimes(1);
        expect(vi.mocked(wire.toClaudeWireModel)).toHaveBeenCalledWith(`claude-${tier}`);
        expect(vi.mocked(sdk.query).mock.calls[0][0].options?.model).toBe(tier);
      }
    );

    it('translates a pass-through model exactly once as well', async () => {
      await runQuery('GLM-4.7');

      expect(vi.mocked(wire.toClaudeWireModel)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(sdk.query).mock.calls[0][0].options?.model).toBe('GLM-4.7');
    });

    it.each(CLAUDE_TIERS)('produces the bare alias %s only inside the wire value', (tier) => {
      // The containment property: the alias comes into existence here and the canonical
      // ID is what every other consumer keeps seeing.
      expect(wire.unwrapClaudeWireModel(wire.toClaudeWireModel(`claude-${tier}`))).toBe(tier);
    });
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

    it('should hold one entry per tier in the single source, named by it', () => {
      // The catalogue is derived from CLAUDE_TIER_ROWS, so a tier added there appears
      // here without this file being touched -- and a tier renamed there cannot leave a
      // stale name behind.
      const models = provider.getAvailableModels();

      expect(models.map((m) => m.id).sort()).toEqual(
        [...CLAUDE_TIERS].sort().map((tier) => `claude-${tier}`)
      );
      for (const row of CLAUDE_TIER_ROWS) {
        const entry = models.find((m) => m.id === `claude-${row.tier}`);
        expect(entry?.name).toBe(CLAUDE_TIER_DISPLAY_NAMES[row.tier]);
        expect(entry?.maxOutputTokens).toBe(row.maxOutputTokens);
      }
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
      provider.setConfig({ cliPath: '/usr/bin/claude' });

      const config = provider.getConfig();
      expect(config.apiKey).toBe('key1');
      expect(config.cliPath).toBe('/usr/bin/claude');
    });
  });
});
