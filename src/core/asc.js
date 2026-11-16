// Logique pure : retrouver l'AudioSpecificConfig dans ce que l'encodeur rend.
//
// Mesure du 2026-11-16, iPhone 12 mini / iOS 27.2 : Safari remet 39 octets
// dans `decoderConfig.description`. Un AudioSpecificConfig en fait 2 (5 avec
// SBR) : ces 39 octets sont un esds complet. Or mp4-muxer fait
//     new Uint8Array(track.info.decoderConfig.description)
// et l'insere tel quel comme DecoderSpecificInfo dans l'esds qu'il construit.
// Resultat : un esds imbrique dans un esds. Le fichier reste valide et reste
// muet — c'est exactement ce qui a ete constate.
//
// Les descripteurs MPEG-4 sont des triplets tag / longueur / contenu, la
// longueur etant codee sur 1 a 4 octets dont le bit 0x80 marque la suite.

const TAG_DECODER_SPECIFIC_INFO = 0x05;
const MAX_ASC = 64;

function readLength(bytes, i) {
  let len = 0;
  let n = 0;
  let byte;
  do {
    if (i + n >= bytes.length) return null;
    byte = bytes[i + n];
    len = (len << 7) | (byte & 0x7f);
    n++;
  } while ((byte & 0x80) && n < 4);
  return { len, next: i + n };
}

export function extractAudioSpecificConfig(description) {
  if (!description) return null;
  const bytes = description instanceof Uint8Array
    ? description
    : new Uint8Array(description);
  if (!bytes.length) return null;

  // Deja un AudioSpecificConfig nu : rien a extraire. On ne se contente pas
  // de la taille — du bruit de 3 octets passerait. Les 5 bits de poids fort
  // portent l'objectType : 1 a 5 couvrent AAC Main, LC, SSR, LTP et SBR.
  if (bytes.length >= 2 && bytes.length <= 5 && bytes[0] !== TAG_DECODER_SPECIFIC_INFO) {
    const objectType = bytes[0] >> 3;
    if (objectType >= 1 && objectType <= 5) return bytes;
  }

  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] !== TAG_DECODER_SPECIFIC_INFO) continue;
    const read = readLength(bytes, i + 1);
    if (!read) continue;
    const { len, next } = read;
    // un descripteur qui annonce plus que ce qui reste est du bruit
    if (len < 1 || len > MAX_ASC || next + len > bytes.length) continue;
    return bytes.subarray(next, next + len);
  }

  return null;
}
