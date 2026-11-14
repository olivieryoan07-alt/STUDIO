import { test, assert } from './harness.js';
import { shareVideo } from '../src/probe/share.js';

const blob = () => new Blob([new Uint8Array([0, 1, 2])], { type: 'video/mp4' });

test('un navigateur sans partage renvoie une raison lisible', async () => {
  const r = await shareVideo(blob(), 'a.mp4', { canShare: null });
  assert(r.ok === false, 'doit echouer');
  assert(r.reason.includes('partage'), 'raison explicite, pas une exception — ' + r.reason);
});

test('un refus de canShare est rapporté, pas tenté quand même', async () => {
  const r = await shareVideo(blob(), 'a.mp4', {
    canShare: () => false,
    share: () => { throw new Error('ne doit pas etre appele'); }
  });
  assert(r.ok === false, 'doit echouer');
  assert(r.reason.includes('mp4'), 'la raison doit nommer le format refuse — ' + r.reason);
});

test('une annulation par l’utilisateur n’est pas un échec technique', async () => {
  const err = new Error('cancel');
  err.name = 'AbortError';
  const r = await shareVideo(blob(), 'a.mp4', {
    canShare: () => true,
    share: () => Promise.reject(err)
  });
  assert(r.ok === false, 'une annulation n est pas un succes');
  assert(r.reason.includes('annul'),
         'doit distinguer annulation et refus — ' + r.reason);
});

test('un partage accepté est rapporté comme réussi', async () => {
  let got = null;
  const r = await shareVideo(blob(), 'studio.mp4', {
    canShare: () => true,
    share: (data) => { got = data; return Promise.resolve(); }
  });
  assert(r.ok === true, 'doit reussir — ' + r.reason);
  assert(got.files[0].name === 'studio.mp4', 'le fichier partage doit porter le nom demande');
});
