/**
 * Client-side contract conformance: every contract operation resolves to a
 * client method, and every mapped method actually exists on the client object.
 *
 * The map is total over OperationName, so a missing mapping fails typecheck;
 * this test additionally checks the referenced methods exist at runtime.
 */

import { describe, it, expect } from 'vitest';
import { OPERATIONS } from '@automaker/types';
import { HttpApiClient } from '@/lib/http-api-client';
import { CLIENT_OPERATION_METHODS } from '@/lib/contract-client';

describe('client contract conformance', () => {
  it('resolves every contract operation to a client method', () => {
    const client = new HttpApiClient() as unknown as Record<string, Record<string, unknown>>;

    for (const [name, ref] of Object.entries(CLIENT_OPERATION_METHODS)) {
      const namespace = client[ref.namespace];
      expect(namespace, `no client namespace "${ref.namespace}" for ${name}`).toBeDefined();
      expect(typeof namespace[ref.method], `${name} -> ${ref.namespace}.${ref.method}`).toBe(
        'function'
      );
    }
  });

  it('covers exactly the contract operations', () => {
    expect(new Set(Object.keys(CLIENT_OPERATION_METHODS))).toEqual(
      new Set(Object.keys(OPERATIONS))
    );
  });
});
