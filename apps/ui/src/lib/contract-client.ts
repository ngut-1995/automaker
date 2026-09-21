/**
 * Client side of the operation contract.
 *
 * Maps every contract operation to the client method that implements it. The
 * map is total over `OperationName`, so adding a contract entry without a
 * client method is a compile error; the conformance test additionally checks
 * that each referenced method actually exists at runtime.
 */

import type { OperationName } from '@automaker/types';

export interface ClientMethodRef {
  /** Namespace on the `HttpApiClient`, e.g. 'features'. */
  namespace: string;
  /** Method name within the namespace, e.g. 'getAll'. */
  method: string;
}

export const CLIENT_OPERATION_METHODS: Record<OperationName, ClientMethodRef> = {
  'features.list': { namespace: 'features', method: 'getAll' },
  'features.listPost': { namespace: 'features', method: 'getAll' },
  'features.get': { namespace: 'features', method: 'get' },
  'features.create': { namespace: 'features', method: 'create' },
  'features.update': { namespace: 'features', method: 'update' },
  'features.bulkUpdate': { namespace: 'features', method: 'bulkUpdate' },
  'features.bulkDelete': { namespace: 'features', method: 'bulkDelete' },
  'features.delete': { namespace: 'features', method: 'delete' },
  'features.getAgentOutput': { namespace: 'features', method: 'getAgentOutput' },
  'features.rawOutput': { namespace: 'features', method: 'getRawOutput' },
  'features.generateTitle': { namespace: 'features', method: 'generateTitle' },
  'features.export': { namespace: 'features', method: 'export' },
  'features.import': { namespace: 'features', method: 'import' },
  'features.checkConflicts': { namespace: 'features', method: 'checkConflicts' },
  'features.getOrphaned': { namespace: 'features', method: 'getOrphaned' },
  'features.resolveOrphaned': { namespace: 'features', method: 'resolveOrphaned' },
  'features.bulkResolveOrphaned': { namespace: 'features', method: 'bulkResolveOrphaned' },
  'autoMode.start': { namespace: 'autoMode', method: 'start' },
  'autoMode.stop': { namespace: 'autoMode', method: 'stop' },
  'autoMode.stopFeature': { namespace: 'autoMode', method: 'stopFeature' },
  'autoMode.status': { namespace: 'autoMode', method: 'status' },
  'autoMode.runFeature': { namespace: 'autoMode', method: 'runFeature' },
  'autoMode.verifyFeature': { namespace: 'autoMode', method: 'verifyFeature' },
  'autoMode.resumeFeature': { namespace: 'autoMode', method: 'resumeFeature' },
  'autoMode.contextExists': { namespace: 'autoMode', method: 'contextExists' },
  'autoMode.analyzeProject': { namespace: 'autoMode', method: 'analyzeProject' },
  'autoMode.followUpFeature': { namespace: 'autoMode', method: 'followUpFeature' },
  'autoMode.commitFeature': { namespace: 'autoMode', method: 'commitFeature' },
  'autoMode.approvePlan': { namespace: 'autoMode', method: 'approvePlan' },
  'autoMode.resumeInterrupted': { namespace: 'autoMode', method: 'resumeInterrupted' },
  'autoMode.reconcile': { namespace: 'autoMode', method: 'reconcile' },
  'runningAgents.getAll': { namespace: 'runningAgents', method: 'getAll' },
};
