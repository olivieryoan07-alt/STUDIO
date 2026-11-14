// Partage iOS du mp4 produit : c'est par la que le montage final atterrit
// dans la galerie Photos. Repond a la question 3 du §9 (risque 1, bloquant).
//
// `nav` est injectable : c'est ce qui rend la fonction testable sur le Mac,
// sans iPhone et sans feuille de partage.

export async function shareVideo(blob, filename, nav = navigator) {
  if (!nav || typeof nav.canShare !== 'function' || typeof nav.share !== 'function') {
    return { ok: false, reason: 'ce navigateur ne propose pas le partage de fichier' };
  }

  const file = new File([blob], filename, { type: blob.type || 'video/mp4' });

  if (!nav.canShare({ files: [file] })) {
    const ext = filename.split('.').pop();
    return { ok: false, reason: 'partage de fichier refusé pour ce format (' + ext + ')' };
  }

  try {
    await nav.share({ files: [file], title: 'STUDIO' });
    return { ok: true, reason: 'feuille de partage ouverte' };
  } catch (e) {
    if (e && e.name === 'AbortError') {
      return { ok: false, reason: 'partage annulé par l’utilisateur' };
    }
    return { ok: false, reason: 'partage impossible : ' + (e.message || e.name || e) };
  }
}
