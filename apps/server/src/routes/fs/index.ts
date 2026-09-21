/**
 * File system routes
 * Provides REST API equivalents for Electron IPC file operations
 *
 * Routes are registered from the shared operation contract; this file only maps
 * each operation to the handler that implements it.
 */

import { Router } from 'express';
import type { EventEmitter } from '../../lib/events.js';
import { registerContractOperations, type OperationHandlers } from '../contract.js';
import { createReadHandler } from './routes/read.js';
import { createWriteHandler } from './routes/write.js';
import { createMkdirHandler } from './routes/mkdir.js';
import { createReaddirHandler } from './routes/readdir.js';
import { createExistsHandler } from './routes/exists.js';
import { createStatHandler } from './routes/stat.js';
import { createDeleteHandler } from './routes/delete.js';
import { createValidatePathHandler } from './routes/validate-path.js';
import { createResolveDirectoryHandler } from './routes/resolve-directory.js';
import { createSaveImageHandler } from './routes/save-image.js';
import { createBrowseHandler } from './routes/browse.js';
import { createImageHandler } from './routes/image.js';
import { createSaveBoardBackgroundHandler } from './routes/save-board-background.js';
import { createDeleteBoardBackgroundHandler } from './routes/delete-board-background.js';
import { createBrowseProjectFilesHandler } from './routes/browse-project-files.js';
import { createCopyHandler } from './routes/copy.js';
import { createMoveHandler } from './routes/move.js';
import { createDownloadHandler } from './routes/download.js';

export const FS_MOUNT = '/api/fs';

export function createFsHandlers(): OperationHandlers {
  return {
    'fs.read': createReadHandler(),
    'fs.write': createWriteHandler(),
    'fs.mkdir': createMkdirHandler(),
    'fs.readdir': createReaddirHandler(),
    'fs.exists': createExistsHandler(),
    'fs.stat': createStatHandler(),
    'fs.delete': createDeleteHandler(),
    'fs.validatePath': createValidatePathHandler(),
    'fs.resolveDirectory': createResolveDirectoryHandler(),
    'fs.saveImage': createSaveImageHandler(),
    'fs.browse': createBrowseHandler(),
    'fs.image': createImageHandler(),
    'fs.saveBoardBackground': createSaveBoardBackgroundHandler(),
    'fs.deleteBoardBackground': createDeleteBoardBackgroundHandler(),
    'fs.browseProjectFiles': createBrowseProjectFilesHandler(),
    'fs.copy': createCopyHandler(),
    'fs.move': createMoveHandler(),
    'fs.download': createDownloadHandler(),
  };
}

export function createFsRoutes(_events: EventEmitter): Router {
  return registerContractOperations(Router(), FS_MOUNT, createFsHandlers());
}
