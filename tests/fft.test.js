import { test, assert } from './harness.js';
import { fft, hann } from '../src/core/fft.js';

test('une impulsion donne un spectre plat', () => {
  const n = 64, re = new Float32Array(n), im = new Float32Array(n);
  re[0] = 1;
  fft(re, im);
  for (let k = 0; k < n; k++) {
    assert(Math.abs(Math.hypot(re[k], im[k]) - 1) < 1e-5, 'bin ' + k);
  }
});

test('une sinusoïde se concentre sur son bin', () => {
  const n = 1024, k0 = 64;
  const re = new Float32Array(n), im = new Float32Array(n);
  for (let i = 0; i < n; i++) re[i] = Math.cos(2 * Math.PI * k0 * i / n);
  fft(re, im);
  const mag = (k) => Math.hypot(re[k], im[k]);
  for (let k = 2; k < n / 2; k++) {
    if (Math.abs(k - k0) > 2) assert(mag(k) < mag(k0) / 50, 'fuite au bin ' + k);
  }
});

test('la fenêtre de Hann part de zéro et culmine au milieu', () => {
  const w = hann(8);
  assert(w[0] < 1e-6 && w[7] < 0.2, 'les bords doivent être bas');
  assert(Math.abs(w[4] - 1) < 0.2, 'le centre doit approcher 1');
});

test('une longueur qui n’est pas une puissance de 2 est refusée', () => {
  let msg = '';
  try { fft(new Float32Array(100), new Float32Array(100)); } catch (e) { msg = e.message; }
  assert(msg.includes('2'), 'le message doit dire pourquoi : ' + msg);
});
