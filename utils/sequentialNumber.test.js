import test from 'node:test';
import assert from 'node:assert/strict';
import {
  incrementSequentialNumber,
  parseSequentialNumber,
  generateRegistrationNumbers,
  generateRollNumbers,
} from './sequentialNumber.js';

test('parseSequentialNumber extracts prefix and trailing digits', () => {
  assert.deepEqual(parseSequentialNumber('BSF2205801'), {
    prefix: 'BSF',
    numberPart: '2205801',
    width: 7,
  });

  assert.deepEqual(parseSequentialNumber('001'), {
    prefix: '',
    numberPart: '001',
    width: 3,
  });
});

test('incrementSequentialNumber handles standard and padded numeric sequences', () => {
  assert.equal(incrementSequentialNumber('BSF2205801', 1), 'BSF2205802');
  assert.equal(incrementSequentialNumber('BSF2205801', 99), 'BSF2205900');
  assert.equal(incrementSequentialNumber('001', 1), '002');
  assert.equal(incrementSequentialNumber('009', 1), '010');
  assert.equal(incrementSequentialNumber('099', 1), '100');
  assert.equal(incrementSequentialNumber('BSCS-001', 1), 'BSCS-002');
  assert.equal(incrementSequentialNumber('BSCS260001', 1), 'BSCS260002');
  assert.equal(incrementSequentialNumber('REG20260001', 1), 'REG20260002');
  assert.equal(incrementSequentialNumber('FA2026001', 1), 'FA2026002');
  assert.equal(incrementSequentialNumber('2026BSCS001', 1), '2026BSCS002');
});

test('generateRegistrationNumbers returns a contiguous range, including padded zeros', () => {
  const registrationRange = generateRegistrationNumbers('BSF2205801', 3);
  assert.deepEqual(registrationRange, ['BSF2205801', 'BSF2205802', 'BSF2205803']);

  const rollRange = generateRollNumbers('001', 3);
  assert.deepEqual(rollRange, ['001', '002', '003']);
});

test('parseSequentialNumber rejects non-sequential strings', () => {
  assert.throws(() => parseSequentialNumber('ABC'), /end with digits/);
  assert.throws(() => incrementSequentialNumber('BSF2205801A', 1), /end with digits/);
});
