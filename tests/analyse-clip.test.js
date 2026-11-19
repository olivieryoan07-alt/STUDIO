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

// RELECTURE FINALE, constat Critical 2 : deux seuils gouvernent l'horizon, et
// celui qui decide s'il se declenche n'etait pas affiche. Impossible a regler.
test('la force de l horizon a sa propre distribution', () => {
  const s = statistiques([{ nettete: 0, inclinaison: 0, forceHorizon: 0.5, crame: 0, bouche: 0 }]);
  assert(s.forceHorizon && s.forceHorizon.max === 0.5, JSON.stringify(s.forceHorizon));
});

test('les angles non publies ne faussent pas la distribution', () => {
  const s = statistiques([
    { nettete: 0, inclinaison: null, forceHorizon: 0, crame: 0, bouche: 0 },
    { nettete: 0, inclinaison: 20, forceHorizon: 0.5, crame: 0, bouche: 0 }
  ]);
  assert(s.inclinaison.min === 20 && s.inclinaison.max === 20, JSON.stringify(s.inclinaison));
});

// RELECTURE FINALE, constat Important 3 : la distribution etait signee alors
// que le verdict compare une valeur absolue. Une mediane negative en face d'un
// seuil positif ne permet de regler aucun seuil.
test('la distribution de l inclinaison est absolue, comme le verdict', () => {
  const m = Array.from({ length: 100 }, (_, i) => ({
    nettete: 0, inclinaison: i % 2 ? 20 : -20, forceHorizon: 0.5, crame: 0, bouche: 0
  }));
  const s = statistiques(m);
  assert(s.inclinaison.min === 20 && s.inclinaison.median === 20, JSON.stringify(s.inclinaison));
});
