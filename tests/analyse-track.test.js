import { test, assert } from './harness.js';
import { analyseTrack } from '../src/probe/analyse-track.js';

test('analyseTrack refuse un fichier illisible en le nommant', async () => {
  const faux = new File([new Uint8Array([1, 2, 3])], 'casse.mp3');
  const err = await analyseTrack(faux).then(() => null, (e) => e);
  assert(err !== null, 'un fichier non décodable doit rejeter');
  assert(err.message.includes('casse.mp3'), 'message : ' + (err && err.message));
});
