import { test, assert } from './harness.js';
import { inspectFile } from '../src/probe/inspect.js';

// Review Focus 3 : un fichier choisi qui n'est pas une video decodable
// (Live Photo, HEIC, fichier sans piste video) doit donner un message clair
// nommant le fichier, jamais une exception brute du demuxeur.

test('un fichier qui n’est pas une vidéo est refusé en nommant le fichier', async () => {
  const bogus = new File([new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04])], 'live-photo.heic');
  const err = await inspectFile(bogus).then(() => null, (e) => e);
  assert(err !== null, 'un fichier non decodable doit rejeter, pas resoudre');
  assert(err.message.includes('live-photo.heic'),
         'le message doit nommer le fichier refuse, il valait : ' + (err && err.message));
});

test('un fichier vide est refusé sans exception brute', async () => {
  const empty = new File([new Uint8Array(0)], 'vide.mp4');
  const err = await inspectFile(empty).then(() => null, (e) => e);
  assert(err !== null, 'un fichier vide doit rejeter');
  assert(err.message.includes('vide.mp4'), 'le message doit nommer le fichier');
});
