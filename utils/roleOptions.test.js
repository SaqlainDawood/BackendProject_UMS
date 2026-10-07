import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRoleOption, getRoleOptions } from './roleOptions.js';

test('normalizeRoleOption returns id/value and label', () => {
  const role = { _id: '64b0c4f3d0d6a31c5e2a1111', name: 'Faculty' };

  assert.deepEqual(normalizeRoleOption(role), {
    value: '64b0c4f3d0d6a31c5e2a1111',
    label: 'Faculty',
  });
});

test('getRoleOptions filters to active roles and keeps only relevant fields', () => {
  const roles = [
    { _id: '1', name: 'Admin', isActive: true },
    { _id: '2', name: 'Faculty', isActive: true },
    { _id: '3', name: 'Inactive Role', isActive: false },
  ];

  assert.deepEqual(getRoleOptions(roles), [
    { value: '1', label: 'Admin' },
    { value: '2', label: 'Faculty' },
  ]);
});
