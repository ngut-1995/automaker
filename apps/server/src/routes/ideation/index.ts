/**
 * Ideation routes - HTTP API for brainstorming and idea management
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import type { EventEmitter } from '../../lib/events.js';
import type { IdeationService } from '../../services/ideation-service.js';
import type { FeatureLoader } from '../../services/feature-loader.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';

// Route handlers
import { createSessionStartHandler } from './routes/session-start.js';
import { createSessionMessageHandler } from './routes/session-message.js';
import { createSessionStopHandler } from './routes/session-stop.js';
import { createSessionGetHandler } from './routes/session-get.js';
import { createIdeasListHandler } from './routes/ideas-list.js';
import { createIdeasCreateHandler } from './routes/ideas-create.js';
import { createIdeasGetHandler } from './routes/ideas-get.js';
import { createIdeasUpdateHandler } from './routes/ideas-update.js';
import { createIdeasDeleteHandler } from './routes/ideas-delete.js';
import { createAnalyzeHandler, createGetAnalysisHandler } from './routes/analyze.js';
import { createConvertHandler } from './routes/convert.js';
import { createAddSuggestionHandler } from './routes/add-suggestion.js';
import { createPromptsHandler, createPromptsByCategoryHandler } from './routes/prompts.js';
import { createSuggestionsGenerateHandler } from './routes/suggestions-generate.js';

export const IDEATION_MOUNT = '/api/ideation';

export function createIdeationHandlers(
  events: EventEmitter,
  ideationService: IdeationService,
  featureLoader: FeatureLoader
): OperationHandlers {
  return {
    // Session management
    'ideation.sessionStart': createSessionStartHandler(ideationService),
    'ideation.sessionMessage': createSessionMessageHandler(ideationService),
    'ideation.sessionStop': createSessionStopHandler(events, ideationService),
    'ideation.sessionGet': createSessionGetHandler(ideationService),

    // Ideas CRUD
    'ideation.ideasList': createIdeasListHandler(ideationService),
    'ideation.ideasCreate': createIdeasCreateHandler(events, ideationService),
    'ideation.ideasGet': createIdeasGetHandler(ideationService),
    'ideation.ideasUpdate': createIdeasUpdateHandler(events, ideationService),
    'ideation.ideasDelete': createIdeasDeleteHandler(events, ideationService),

    // Project analysis
    'ideation.analyze': createAnalyzeHandler(ideationService),
    'ideation.analysis': createGetAnalysisHandler(ideationService),

    // Convert to feature
    'ideation.convert': createConvertHandler(events, ideationService, featureLoader),

    // Add suggestion to board as a feature
    'ideation.addSuggestion': createAddSuggestionHandler(ideationService, featureLoader),

    // Guided prompts (no validation needed - static data)
    'ideation.prompts': createPromptsHandler(ideationService),
    'ideation.promptsByCategory': createPromptsByCategoryHandler(ideationService),

    // Generate suggestions (structured output)
    'ideation.suggestionsGenerate': createSuggestionsGenerateHandler(ideationService),
  };
}

export function createIdeationRoutes(
  events: EventEmitter,
  ideationService: IdeationService,
  featureLoader: FeatureLoader
): Router {
  return registerContractOperations(
    Router(),
    IDEATION_MOUNT,
    createIdeationHandlers(events, ideationService, featureLoader)
  );
}
