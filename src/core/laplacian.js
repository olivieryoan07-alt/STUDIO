// Logique pure : la nettete d'une image, mesuree par la variance de sa
// reponse au laplacien.
//
// Pourquoi ce critere et pas « ca bouge » : sur cette matiere, filmee en
// marchant, tout bouge en permanence et les pics de mouvement sont souvent
// les pires images (§5.2 de la conception). Le laplacien, lui, mesure la
// presence de details francs — exactement ce que le flou de marche detruit.
//
// La variance, et non la moyenne : une image sombre et une image claire
// repondent pareil, parce qu'une difference de niveau moyen laisse le
// laplacien inchange. Le critere ne confond donc pas « sombre » et « flou ».

export function sharpness(gray, w, h) {
  if (w < 3 || h < 3) return 0;

  // bords exclus du calcul ET du denominateur : un laplacien calcule sur un
  // bord replique inventerait un contour qui n'existe pas.
  let somme = 0;
  let sommeCarres = 0;
  let n = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      somme += l;
      sommeCarres += l * l;
      n++;
    }
  }

  const moyenne = somme / n;
  return sommeCarres / n - moyenne * moyenne;
}
