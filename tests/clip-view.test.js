import { test, assert } from './harness.js';
import { texteColorimetrie } from '../src/bench/clip-view.js';

// Review Focus 4 : ne jamais laisser croire a une mesure qui n'a pas eu lieu.
test('une colorimetrie non lue est annoncee comme telle', () => {
  assert(texteColorimetrie({ colourKnown: false, transferCharacteristics: '' })
         === 'colorimétrie non lue');
});

test('une colorimetrie lue est affichee telle quelle', () => {
  assert(texteColorimetrie({ colourKnown: true, transferCharacteristics: 'PQ' })
         === 'PQ');
});
