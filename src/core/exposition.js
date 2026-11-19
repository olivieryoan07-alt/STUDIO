// Logique pure : quelle part de l'image est cramee (blanc sans detail) ou
// bouchee (noir sans detail).
//
// Ce que ce critere attrape, et que la nettete manque : un ciel brule est
// parfaitement net — il n'a simplement plus aucune information. Le laplacien
// y repond zero sur la zone cramee mais fort ailleurs, donc l'image passerait.
//
// Les niveaux sont inclusifs et viennent de l'appelant : ils dependent de la
// colorimetrie, et la conception (§3) previent qu'ils ne veulent pas dire la
// meme chose en SDR et en HDR. Aucun nombre en dur ici.

export function exposition(gray, niveauCrame, niveauBouche) {
  const n = gray.length;
  if (n === 0) return { crame: 0, bouche: 0 };

  let crames = 0;
  let bouches = 0;
  for (let i = 0; i < n; i++) {
    const v = gray[i];
    if (v >= niveauCrame) crames++;
    else if (v <= niveauBouche) bouches++;
  }

  return { crame: crames / n, bouche: bouches / n };
}
