import { test, assert } from './harness.js';
import { statistiques } from '../src/probe/analyse-clip.js';

test('la mediane et le neuvieme decile sont justes', () => {
  const m = Array.from({ length: 11 }, (_, i) => ({
    nettete: i * 10, inclinaison: 0, crame: 0, bouche: 0
  }));
  const s = statistiques(m);
  assert(s.nettete.min === 0 && s.nettete.max === 100);
  assert(s.nettete.median === 50, 'mediane ' + s.nettete.median);
  assert(s.nettete.p90 === 90, 'p90 ' + s.nettete.p90);
});

test('les statistiques d une liste vide ne plantent pas', () => {
  const s = statistiques([]);
  assert(s.nettete.median === 0 && s.nettete.max === 0);
});
