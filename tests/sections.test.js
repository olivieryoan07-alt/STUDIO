import { test, assert } from './harness.js';
import { smoothEnvelope, findClimax, sections } from '../src/core/sections.js';

const RATE = 93.75;

function palier(durSec, valeurs) {
  const n = Math.round(RATE * durSec);
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) env[i] = valeurs(i / RATE);
  return env;
}

test('le lissage écrase les pics isolés et garde les plateaux', () => {
  const env = palier(20, () => 1);
  env[500] = 50;
  const s = smoothEnvelope(env, RATE, 2);
  assert(s[500] < 2, 'un pic isolé ne doit pas survivre au lissage : ' + s[500]);
  assert(Math.abs(s[1000] - 1) < 0.1, 'un plateau doit être conservé : ' + s[1000]);
});

test('le point culminant est le saut, PAS le maximum', () => {
  // calme 10 s, saut a 10 s, puis plateau LEGEREMENT plus fort a la fin :
  // le maximum global est a la fin, le saut est a 10 s.
  const env = palier(30, (t) => (t < 10 ? 0.2 : t < 22 ? 1.0 : 1.15));
  const c = findClimax(env, RATE);
  assert(Math.abs(c.timeSec - 10) < 1.5,
         'attendu ~10 s (le saut), obtenu ' + c.timeSec.toFixed(1) + ' s');
  assert(c.timeSec < 20, 'ne doit pas désigner le maximum global en fin de morceau');
});

test('le saut est mesuré après un passage plus calme', () => {
  const env = palier(30, (t) => (t < 15 ? 1.0 : 1.05));
  const c = findClimax(env, RATE);
  assert(c.stepRatio < 1.5, 'une montée insignifiante doit se voir : ' + c.stepRatio.toFixed(2));
});

test('les sections suivent les paliers d’énergie', () => {
  const env = palier(30, (t) => (t < 10 ? 0.2 : t < 20 ? 1.0 : 0.3));
  const s = sections(env, RATE);
  assert(s.length >= 3, 'trois paliers attendus, obtenu ' + s.length);
  assert(Math.abs(s[1].startSec - 10) < 2, 'frontière vers 10 s, obtenu ' + s[1].startSec);
});

// REVUE FINALE 2026-11-16. Trois defauts mesures par le relecteur, chacun
// invisible pour les fixtures a UN SEUL palier utilisees plus haut : la regle
// « le plus grand saut » ne peut pas se tester avec un seul saut, puisque
// n'importe quelle implementation qui trouve *un* saut passe.

test('le point culminant résiste à une intro calme', () => {
  // structure metal canonique : intro propre, entree du groupe, drop plus tard
  const env = palier(200, (t) => (t < 20 ? 0.03 : t < 150 ? 0.45 : 1.0));
  const c = findClimax(env, RATE);
  assert(Math.abs(c.timeSec - 150) < 3,
         'attendu ~150 s (le drop), obtenu ' + c.timeSec.toFixed(1) + ' s');
});

test('un fondu d’entrée ne devient pas le point culminant', () => {
  const env = palier(150, (t) => (t < 8 ? (t / 8) * 0.5 : t < 90 ? 0.5 : 1.0));
  const c = findClimax(env, RATE);
  assert(Math.abs(c.timeSec - 90) < 3,
         'attendu ~90 s, obtenu ' + c.timeSec.toFixed(1) + ' s');
});

test('le point culminant n’est pas en retard sur le saut', () => {
  // le lissage est une moyenne glissante CAUSALE : sans compensation, le
  // sommet est systematiquement ~700 ms trop tard. Grossierement audible.
  const env = palier(40, (t) => (t < 20 ? 0.2 : 1.0));
  const c = findClimax(env, RATE);
  assert(Math.abs(c.timeSec - 20) < 0.25,
         'décalage de ' + ((c.timeSec - 20) * 1000).toFixed(0) + ' ms');
});
