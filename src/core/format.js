// Logique pure : affichage des durees.
// Revue 2026-11-16 : la version inline du banc arrondissait les secondes
// avant d'extraire les minutes, et affichait « 1:60 » pour 119,6 s.

export function mmss(sec) {
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + String(s).padStart(2, '0');
}
