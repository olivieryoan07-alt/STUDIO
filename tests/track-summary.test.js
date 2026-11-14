import { test, assert } from './harness.js';
import { summariseTrack } from '../src/core/track-summary.js';

test('hvc1 est reconnu comme HEVC', () => {
  assert(summariseTrack({ codec: 'hvc1.2.4.L120.B0', bitDepth: 8 }).codecFamily === 'HEVC');
});

test('avc1 est reconnu comme H.264', () => {
  assert(summariseTrack({ codec: 'avc1.640034', bitDepth: 8 }).codecFamily === 'H.264');
});

test('10 bits + PQ est signale comme HDR', () => {
  const r = summariseTrack({ codec: 'hvc1.2.4.L120.B0', bitDepth: 10, transferCharacteristics: 'pq' });
  assert(r.hdr === true, 'hdr doit etre vrai');
  assert(r.warnings.some((w) => w.includes('exposition')),
         'doit prevenir que les seuils d exposition sont fausses');
});

test('8 bits SDR ne declenche aucun avertissement', () => {
  assert(summariseTrack({ codec: 'avc1.640034', bitDepth: 8 }).warnings.length === 0);
});

test('un codec inconnu est rapporte, pas ignore', () => {
  assert(summariseTrack({ codec: 'xxxx', bitDepth: 8 }).codecFamily === 'inconnu');
});
