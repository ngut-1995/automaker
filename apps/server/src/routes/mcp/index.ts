/**
 * MCP routes - HTTP API for testing MCP servers
 *
 * Provides endpoints for:
 * - Testing MCP server connections
 * - Listing available tools from MCP servers
 *
 * Mounted at /api/mcp in the main server. Routes are registered from the shared
 * operation contract; this file only maps each operation to its handler.
 */

import { Router } from 'express';
import type { MCPTestService } from '../../services/mcp-test-service.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createTestServerHandler } from './routes/test-server.js';
import { createListToolsHandler } from './routes/list-tools.js';

export const MCP_MOUNT = '/api/mcp';

/**
 * Create MCP operation handlers.
 *
 * @param mcpTestService - Instance of MCPTestService for testing connections
 */
export function createMCPHandlers(mcpTestService: MCPTestService): OperationHandlers {
  return {
    'mcp.testServer': createTestServerHandler(mcpTestService),
    'mcp.listTools': createListToolsHandler(mcpTestService),
  };
}

export function createMCPRoutes(mcpTestService: MCPTestService): Router {
  return registerContractOperations(Router(), MCP_MOUNT, createMCPHandlers(mcpTestService));
}
