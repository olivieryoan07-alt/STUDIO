import { test, assert } from './harness.js';
import { loadAudio, audioExcerpt } from '../src/probe/audio.js';

const SR = 48000;

function constant(sec, sampleRate, v) {
  const b = new AudioBuffer({ length: Math.round(sec * sampleRate), numberOfChannels: 1, sampleRate });
  b.getChannelData(0).fill(v);
  return b;
}

function ramp(sec, sampleRate) {
  const b = new AudioBuffer({ length: Math.round(sec * sampleRate), numberOfChannels: 1, sampleRate });
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = i / sampleRate;
  return b;
}

const valueAt = (t) => t;

// §5.4 bis de la conception, tranché par l'utilisateur :
// entrée franche (c'est du metal, la première image doit cogner),
// sortie en fondu court (~0,4 s) pour éviter le claquement.

test('l’extrait commence net, sans fondu d’entrée', () => {
  const out = audioExcerpt(ramp(10, SR), 2, 4, 0.4);
  assert(Math.abs(out.getChannelData(0)[0] - valueAt(2.0)) < 1e-6,
         'le premier échantillon doit valoir exactement celui de la source');
});

test('l’extrait se termine par un fondu descendant', () => {
  const d = audioExcerpt(constant(10, SR, 1.0), 2, 4, 0.4).getChannelData(0);
  assert(d[d.length - 1] < 0.01, 'dernier échantillon quasi nul, obtenu ' + d[d.length - 1]);
  assert(Math.abs(d[d.length - 1 - Math.round(0.4 * SR)] - 1.0) < 0.05,
         'le fondu ne doit pas commencer avant 0,4 s de la fin');
});

test('un extrait plus long que la source est refusé explicitement', () => {
  let msg = '';
  try { audioExcerpt(constant(3, SR, 1.0), 2, 4, 0.4); } catch (e) { msg = e.message; }
  assert(msg.length > 0, 'doit lever, pas rendre un buffer tronqué en silence');
});

test('la durée de l’extrait est exactement celle demandée', () => {
  const out = audioExcerpt(constant(10, SR, 1.0), 2, 4, 0.4);
  assert(out.length === 4 * SR, 'attendu ' + (4 * SR) + ' échantillons, obtenu ' + out.length);
});

test('un fichier audio illisible donne un message nommant le fichier', async () => {
  const octets = new File([new Uint8Array([1, 2, 3])], 'achete.m4a');
  const err = await loadAudio(octets).then(() => null, (e) => e);
  assert(err !== null, 'un fichier non décodable doit rejeter');
  assert(err.message.includes('achete.m4a'),
         'le message doit nommer le fichier refusé, obtenu : ' + (err && err.message));
});
