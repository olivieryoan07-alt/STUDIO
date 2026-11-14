import { test, assert } from './harness.js';

test('le harnais signale un échec', () => {
  let caught = false;
  try { assert(false, 'attendu'); } catch (e) { caught = true; }
  assert(caught, 'assert doit lever quand la condition est fausse');
});
