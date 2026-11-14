// Logique pure : traduit une configuration de piste video en verdict lisible.
// Aucune dependance, aucun acces au DOM — testable sans iPhone.

const FAMILIES = [
  [/^hvc1|^hev1/, 'HEVC'],
  [/^avc1|^avc3/, 'H.264'],
  [/^av01/, 'AV1'],
  [/^vp09|^vp8/, 'VP9']
];

export function summariseTrack(config) {
  const codec = String(config.codec || '');
  const bitDepth = config.bitDepth || 8;
  const transfer = String(config.transferCharacteristics || '').toLowerCase();

  let codecFamily = 'inconnu';
  for (const [pattern, name] of FAMILIES) {
    if (pattern.test(codec)) { codecFamily = name; break; }
  }

  const hdr = bitDepth >= 10 || transfer === 'pq' || transfer === 'hlg';

  const warnings = [];
  if (hdr) {
    warnings.push(
      "Source HDR (" + bitDepth + " bits" + (transfer ? ", " + transfer : "") + ") : " +
      "lus sur un canvas 8 bits, les seuils d'exposition du moteur ne mesurent plus ce qu'ils annoncent."
    );
  }
  if (codecFamily === 'inconnu') {
    warnings.push("Codec non reconnu (" + codec + ") : le decodage n'est pas garanti.");
  }

  return { codecFamily, hdr, warnings };
}
